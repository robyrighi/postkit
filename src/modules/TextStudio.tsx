import { useEffect, useMemo, useRef, useState } from 'react'
import { ColorRow, Field, FilePick, FilterChips, Segmented, Slider } from '../components/Controls'
import { ExportPanel } from '../components/ExportPanel'
import { useEnsureProfile } from '../components/ProfileGate'
import { useI18n, type Key } from '../i18n'
import { track } from '../lib/api'
import { FORMATS, type FormatKey } from '../lib/config'
import { canvasToFile, stamp } from '../lib/exporter'
import {
  applyFilter,
  ctx2d,
  cutSubject,
  defaultFraming,
  drawCover,
  loadImage,
  makeCanvas,
  type FilterKey,
  type Framing,
  type Source,
} from '../lib/image'
import {
  defaultX,
  drawBadge,
  drawOverlay,
  drawTemplateText,
  loadAllFonts,
  TEXT_TEMPLATES,
  type Align,
} from '../lib/templates'

const MODULE = 'text'
const COLORS = ['#ffffff', '#111111', '#ffd400', '#ff5a36', '#ff7eb6', '#4cc9f0', '#80ed99']

type AiState = 'off' | 'loading' | 'ready' | 'error'

// Griglia delle 9 posizioni rapide
const POSITIONS: { id: string; align: Align; y: number; label: Key }[] = [
  { id: 'tl', align: 'left', y: 0.14, label: 'text.pos.tl' },
  { id: 'tc', align: 'center', y: 0.14, label: 'text.pos.tc' },
  { id: 'tr', align: 'right', y: 0.14, label: 'text.pos.tr' },
  { id: 'ml', align: 'left', y: 0.5, label: 'text.pos.ml' },
  { id: 'mc', align: 'center', y: 0.5, label: 'text.pos.mc' },
  { id: 'mr', align: 'right', y: 0.5, label: 'text.pos.mr' },
  { id: 'bl', align: 'left', y: 0.84, label: 'text.pos.bl' },
  { id: 'bc', align: 'center', y: 0.84, label: 'text.pos.bc' },
  { id: 'br', align: 'right', y: 0.84, label: 'text.pos.br' },
]

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function TextStudio() {
  const { t } = useI18n()
  const [img, setImg] = useState<Source | null>(null)
  const [format, setFormat] = useState<FormatKey>('story')
  const [framing, setFraming] = useState<Framing>(defaultFraming)
  const [filter, setFilter] = useState<FilterKey>('none')
  const [tplId, setTplId] = useState('impact')
  const tpl = TEXT_TEMPLATES.find((v) => v.id === tplId)!
  const [titleRaw, setTitle] = useState<string | null>(null)
  const title = titleRaw ?? t('text.defaultTitle')
  const [subtitle, setSubtitle] = useState('')
  const [sizeK, setSizeK] = useState(1)
  const [x, setX] = useState(defaultX(tpl.align))
  const [y, setY] = useState(tpl.y)
  const [align, setAlign] = useState<Align>(tpl.align)
  const [color, setColor] = useState(tpl.color)
  const [behind, setBehind] = useState(false)
  const [ai, setAi] = useState<AiState>('off')
  const [mask, setMask] = useState<HTMLCanvasElement | null>(null)
  const [badge, setBadge] = useState(true)
  const [fontsOk, setFontsOk] = useState(false)
  const [files, setFiles] = useState<File[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const preview = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ px: number; py: number; x: number; y: number; w: number; h: number } | null>(null)
  const ensureProfile = useEnsureProfile()

  useEffect(() => {
    track(MODULE, 'open')
    loadAllFonts().then(() => setFontsOk(true))
  }, [])

  const reset = () => setFiles(null)

  function pickTemplate(id: string) {
    const tp = TEXT_TEMPLATES.find((v) => v.id === id)!
    setTplId(id)
    setY(tp.y)
    setAlign(tp.align)
    setX(defaultX(tp.align))
    setColor(tp.color)
    setSizeK(1)
    reset()
    track(MODULE, 'template', { id })
  }

  function pickPosition(p: (typeof POSITIONS)[number]) {
    setAlign(p.align)
    setX(defaultX(p.align))
    setY(p.y)
    reset()
    track(MODULE, 'position', { id: p.id })
  }

  function changeAlign(a: Align) {
    setAlign(a)
    setX(defaultX(a))
    reset()
  }

  async function onFile(f: File) {
    setError('')
    try {
      const im = await loadImage(f)
      setImg(im)
      setFraming(defaultFraming)
      setMask(null)
      reset()
      track(MODULE, 'upload', { sample: /^(sport|text|panorama)\.jpg$/.test(f.name) })
    } catch {
      setError(t('common.openError'))
    }
  }

  // Base: foto ritagliata + filtro (ricalcolata solo quando serve)
  const base = useMemo(() => {
    if (!img) return null
    const { w, h } = FORMATS[format]
    const c = makeCanvas(w, h)
    const ctx = ctx2d(c)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    drawCover(ctx, img, w, h, framing)
    applyFilter(c, filter)
    return c
  }, [img, format, framing, filter])

  // Maschera del soggetto per "testo dietro la persona"
  useEffect(() => {
    if (!behind || !base) return
    setMask(null)
    let cancelled = false
    const timer = setTimeout(async () => {
      setAi('loading')
      try {
        const { subjectMask } = await import('../lib/segment')
        const m = await subjectMask(base)
        if (!cancelled) {
          setMask(m)
          setAi('ready')
        }
      } catch (e) {
        console.warn(e)
        if (!cancelled) {
          setAi('error')
          setBehind(false)
          track(MODULE, 'ai_error')
        }
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [behind, base])

  function compose(): HTMLCanvasElement | null {
    if (!base) return null
    const { w, h } = FORMATS[format]
    const scene = makeCanvas(w, h)
    const sctx = ctx2d(scene)
    sctx.drawImage(base, 0, 0)
    drawOverlay(sctx, w, h, tpl.overlay)

    const out = makeCanvas(w, h)
    const ctx = ctx2d(out)
    ctx.drawImage(scene, 0, 0)
    drawTemplateText(ctx, w, h, tpl, { title, subtitle, sizeK, x, y, align, color })
    if (behind && mask) ctx.drawImage(cutSubject(scene, mask), 0, 0)
    if (badge) drawBadge(ctx, w, h, t('common.badgeText'))
    return out
  }

  useEffect(() => {
    const c = compose()
    if (!c || !preview.current) return
    const p = preview.current
    p.width = c.width
    p.height = c.height
    ctx2d(p).drawImage(c, 0, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, tplId, title, subtitle, sizeK, x, y, align, color, behind, mask, badge, fontsOk, t])

  // ---- Trascinamento del testo sull'anteprima ----
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    drag.current = { px: e.clientX, py: e.clientY, x, y, w: r.width, h: r.height }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current
    if (!d) return
    setX(clamp01(d.x + (e.clientX - d.px) / d.w))
    setY(clamp01(d.y + (e.clientY - d.py) / d.h))
  }
  function onPointerUp() {
    if (drag.current) {
      drag.current = null
      setDragging(false)
      reset()
      track(MODULE, 'drag')
    }
  }

  async function prepare() {
    const ok = await ensureProfile()
    if (!ok) return
    setBusy(true)
    try {
      const c = compose()
      if (!c) return
      setFiles([await canvasToFile(c, `peakkit-text-${stamp()}.jpg`)])
      track(MODULE, 'export', { format, tpl: tplId, filter, behind })
    } catch {
      setError(t('common.genericError'))
    } finally {
      setBusy(false)
    }
  }

  const activePos = POSITIONS.find(
    (p) => p.align === align && Math.abs(p.y - y) < 0.02 && Math.abs(defaultX(p.align) - x) < 0.02,
  )

  return (
    <section className="module">
      <header className="module-head">
        <h1>{t('text.title')}</h1>
        <p className="muted">{t('text.lead')}</p>
      </header>

      {!img ? (
        <FilePick onFile={onFile} sample="text.jpg" />
      ) : (
        <div className="workspace">
          <div className={'stage ' + format}>
            <canvas
              ref={preview}
              className={'preview draggable' + (dragging ? ' dragging' : '')}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
            {ai === 'loading' && <div className="stage-badge">{t('text.aiLoading')}</div>}
          </div>

          <div className="panel">
            <Field label={t('text.step1')}>
              <Segmented
                value={format}
                onChange={(v) => (setFormat(v), reset())}
                options={[
                  { value: 'story', label: t('common.story') },
                  { value: 'post', label: t('common.post') },
                  { value: 'square', label: t('common.square') },
                ]}
              />
            </Field>

            <Field label={t('text.step2')}>
              <div className="tpl-grid">
                {TEXT_TEMPLATES.map((tp) => (
                  <button
                    key={tp.id}
                    className={'tpl' + (tp.id === tplId ? ' on' : '')}
                    onClick={() => pickTemplate(tp.id)}
                    style={{
                      fontFamily: `"${tp.font}"`,
                      fontWeight: tp.weight,
                      fontStyle: tp.italic ? 'italic' : 'normal',
                      textTransform: tp.upper ? 'uppercase' : 'none',
                    }}
                  >
                    <span className="tpl-sample">Aa</span>
                    <span className="tpl-name">{t(`tpl.${tp.id}` as Key)}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label={t('text.step3')}>
              <textarea
                value={title}
                onChange={(e) => (setTitle(e.target.value), reset())}
                rows={2}
                maxLength={140}
                placeholder={t('text.titlePh')}
              />
              <input
                value={subtitle}
                onChange={(e) => (setSubtitle(e.target.value), reset())}
                maxLength={120}
                placeholder={t('text.subPh')}
              />
            </Field>

            <Field label={t('text.step4')}>
              <div className="pos-row">
                <div className="pos-grid" role="radiogroup" aria-label={t('text.step4')}>
                  {POSITIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={activePos?.id === p.id}
                      aria-label={t(p.label)}
                      title={t(p.label)}
                      className={'pos-cell ' + p.align + (activePos?.id === p.id ? ' on' : '')}
                      onClick={() => pickPosition(p)}
                    >
                      <span />
                    </button>
                  ))}
                </div>
                <div className="pos-side">
                  <Slider label={t('text.size')} value={sizeK} min={0.5} max={1.8} onChange={(v) => (setSizeK(v), reset())} />
                  <p className="muted small">✋ {t('text.dragHint')}</p>
                </div>
              </div>
            </Field>

            <label className="toggle big-toggle">
              <input
                type="checkbox"
                checked={behind}
                onChange={(e) => {
                  setBehind(e.target.checked)
                  reset()
                  if (e.target.checked) track(MODULE, 'behind_on')
                }}
              />
              <span className="toggle-ui" />
              <span>
                <strong>{t('text.behind')}</strong>
                <span className="muted small block">{t('text.behindHint')}</span>
              </span>
            </label>
            {ai === 'error' && <p className="error">{t('text.aiError')}</p>}

            <details className="more">
              <summary>{t('text.more')}</summary>
              <Slider label={t('text.posX')} value={x} min={0} max={1} onChange={(v) => (setX(v), reset())} />
              <Slider label={t('text.posY')} value={y} min={0} max={1} onChange={(v) => (setY(v), reset())} />
              <Field label={t('text.align')}>
                <Segmented
                  value={align}
                  onChange={changeAlign}
                  options={[
                    { value: 'left', label: t('text.left') },
                    { value: 'center', label: t('text.center') },
                    { value: 'right', label: t('text.right') },
                  ]}
                />
              </Field>
              <Field label={tpl.band ? t('text.colorBand') : t('text.colorText')}>
                <ColorRow value={color} onChange={(c) => (setColor(c), reset())} colors={COLORS} />
              </Field>
              <Slider
                label={t('common.zoom')}
                value={framing.zoom}
                min={1}
                max={2.5}
                onChange={(zoom) => (setFraming({ ...framing, zoom }), reset())}
              />
              <Slider
                label={t('common.moveH')}
                value={framing.x}
                min={-1}
                max={1}
                onChange={(v) => (setFraming({ ...framing, x: v }), reset())}
              />
              <Slider
                label={t('common.moveV')}
                value={framing.y}
                min={-1}
                max={1}
                onChange={(v) => (setFraming({ ...framing, y: v }), reset())}
              />
              <Field label={t('common.filter')}>
                <FilterChips value={filter} onChange={(f) => (setFilter(f), reset(), track(MODULE, 'filter', { f }))} />
              </Field>
              <label className="toggle">
                <input type="checkbox" checked={badge} onChange={(e) => (setBadge(e.target.checked), reset())} />
                <span className="toggle-ui" />
                <span>{t('common.badge')}</span>
              </label>
            </details>

            <div className="row wrap">
              <button className="btn primary big" onClick={prepare} disabled={busy || (behind && ai === 'loading')}>
                {busy ? t('common.preparing') : t('text.create')}
              </button>
              <FilePick onFile={onFile} label={t('common.changePhoto')} compact />
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}
      {error && !img && <p className="error">{error}</p>}
      {files && <ExportPanel module={MODULE} files={files} zipName="peakkit-text.zip" onClose={reset} />}
    </section>
  )
}
