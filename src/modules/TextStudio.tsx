import { useEffect, useMemo, useRef, useState } from 'react'
import { ColorRow, Field, FilePick, Segmented, Slider } from '../components/Controls'
import { ExportPanel } from '../components/ExportPanel'
import { useEnsureProfile } from '../components/ProfileGate'
import { track } from '../lib/api'
import { FORMATS, type FormatKey } from '../lib/config'
import { canvasToFile, stamp } from '../lib/exporter'
import {
  applyFilter,
  ctx2d,
  cutSubject,
  defaultFraming,
  drawCover,
  FILTERS,
  loadImage,
  makeCanvas,
  type FilterKey,
  type Framing,
  type Source,
} from '../lib/image'
import {
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

export function TextStudio() {
  const [img, setImg] = useState<Source | null>(null)
  const [format, setFormat] = useState<FormatKey>('story')
  const [framing, setFraming] = useState<Framing>(defaultFraming)
  const [filter, setFilter] = useState<FilterKey>('none')
  const [tplId, setTplId] = useState('impact')
  const tpl = TEXT_TEMPLATES.find((t) => t.id === tplId)!
  const [title, setTitle] = useState('Il tuo titolo')
  const [subtitle, setSubtitle] = useState('')
  const [sizeK, setSizeK] = useState(1)
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
  const [error, setError] = useState('')
  const preview = useRef<HTMLCanvasElement>(null)
  const ensureProfile = useEnsureProfile()

  useEffect(() => {
    track(MODULE, 'open')
    loadAllFonts().then(() => setFontsOk(true))
  }, [])

  function pickTemplate(id: string) {
    const t = TEXT_TEMPLATES.find((x) => x.id === id)!
    setTplId(id)
    setY(t.y)
    setAlign(t.align)
    setColor(t.color)
    setSizeK(1)
    setFiles(null)
    track(MODULE, 'template', { id })
  }

  async function onFile(f: File) {
    setError('')
    try {
      const im = await loadImage(f)
      setImg(im)
      setFraming(defaultFraming)
      setMask(null)
      setFiles(null)
      track(MODULE, 'upload')
    } catch {
      setError('Non riesco ad aprire questa foto. Prova con un JPG o PNG.')
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
    const t = setTimeout(async () => {
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
        }
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
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
    drawTemplateText(ctx, w, h, tpl, { title, subtitle, sizeK, y, align, color })
    if (behind && mask) ctx.drawImage(cutSubject(scene, mask), 0, 0)
    if (badge) drawBadge(ctx, w, h)
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
  }, [base, tplId, title, subtitle, sizeK, y, align, color, behind, mask, badge, fontsOk])

  async function prepare() {
    const ok = await ensureProfile()
    if (!ok) return
    setBusy(true)
    try {
      const c = compose()
      if (!c) return
      const f = await canvasToFile(c, `postkit-testo-${stamp()}.jpg`)
      setFiles([f])
      track(MODULE, 'export', { format, tpl: tplId, filter, behind })
    } catch {
      setError('Qualcosa è andato storto. Riprova.')
    } finally {
      setBusy(false)
    }
  }

  const reset = () => setFiles(null)

  return (
    <section className="module">
      <header className="module-head">
        <h1>Testo da professionisti</h1>
        <p className="muted">
          Scegli uno stile tipografico curato, scrivi, fatto. Con un tocco puoi mettere il testo <em>dietro</em> la persona,
          l’effetto da rivista.
        </p>
      </header>

      {!img ? (
        <FilePick onFile={onFile} />
      ) : (
        <div className="workspace">
          <div className={'stage ' + format}>
            <canvas ref={preview} className="preview" />
            {ai === 'loading' && <div className="stage-badge">🧠 Riconosco la persona…</div>}
          </div>

          <div className="panel">
            <Field label="1 · Dove lo pubblichi?">
              <Segmented
                value={format}
                onChange={(v) => (setFormat(v), reset())}
                options={[
                  { value: 'story', label: 'Storia' },
                  { value: 'post', label: 'Post' },
                  { value: 'square', label: 'Quadrato' },
                ]}
              />
            </Field>

            <Field label="2 · Stile del testo">
              <div className="tpl-grid">
                {TEXT_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    className={'tpl' + (t.id === tplId ? ' on' : '')}
                    onClick={() => pickTemplate(t.id)}
                    style={{
                      fontFamily: `"${t.font}"`,
                      fontWeight: t.weight,
                      fontStyle: t.italic ? 'italic' : 'normal',
                      textTransform: t.upper ? 'uppercase' : 'none',
                    }}
                  >
                    <span className="tpl-sample">Aa</span>
                    <span className="tpl-name">{t.label}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="3 · Scrivi">
              <textarea
                value={title}
                onChange={(e) => (setTitle(e.target.value), reset())}
                rows={2}
                maxLength={140}
                placeholder="Titolo"
              />
              <input
                value={subtitle}
                onChange={(e) => (setSubtitle(e.target.value), reset())}
                maxLength={120}
                placeholder="Sottotitolo (facoltativo)"
              />
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
                <strong>Testo dietro la persona</strong>
                <span className="muted small block">
                  Funziona con persone ben visibili. La prima volta scarica l’IA (pochi secondi).
                </span>
              </span>
            </label>
            {ai === 'error' && (
              <p className="error">L’IA non è disponibile su questo dispositivo/browser. Il testo resta sopra la foto.</p>
            )}

            <details className="more">
              <summary>Regola testo e foto</summary>
              <Slider label="Grandezza testo" value={sizeK} min={0.5} max={1.8} onChange={(v) => (setSizeK(v), reset())} />
              <Slider label="Altezza testo" value={y} min={0.05} max={0.95} onChange={(v) => (setY(v), reset())} />
              <Field label="Allineamento">
                <Segmented
                  value={align}
                  onChange={(v) => (setAlign(v), reset())}
                  options={[
                    { value: 'left', label: 'Sinistra' },
                    { value: 'center', label: 'Centro' },
                    { value: 'right', label: 'Destra' },
                  ]}
                />
              </Field>
              <Field label={tpl.band ? 'Colore fascia' : 'Colore testo'}>
                <ColorRow value={color} onChange={(c) => (setColor(c), reset())} colors={COLORS} />
              </Field>
              <Slider
                label="Zoom foto"
                value={framing.zoom}
                min={1}
                max={2.5}
                onChange={(zoom) => (setFraming({ ...framing, zoom }), reset())}
              />
              <Slider label="Sposta foto ↔" value={framing.x} min={-1} max={1} onChange={(x) => (setFraming({ ...framing, x }), reset())} />
              <Slider label="Sposta foto ↕" value={framing.y} min={-1} max={1} onChange={(yy) => (setFraming({ ...framing, y: yy }), reset())} />
              <Field label="Filtro foto">
                <div className="chips">
                  {FILTERS.map((f) => (
                    <button key={f.key} className={'chip' + (filter === f.key ? ' on' : '')} onClick={() => (setFilter(f.key), reset())}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </Field>
              <label className="toggle">
                <input type="checkbox" checked={badge} onChange={(e) => (setBadge(e.target.checked), reset())} />
                <span className="toggle-ui" />
                <span>Firma “creato con PostKit”</span>
              </label>
            </details>

            <div className="row wrap">
              <button className="btn primary big" onClick={prepare} disabled={busy || (behind && ai === 'loading')}>
                {busy ? 'Preparo…' : '✨ Crea immagine'}
              </button>
              <FilePick onFile={onFile} label="Cambia foto" compact />
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}
      {error && !img && <p className="error">{error}</p>}
      {files && <ExportPanel module={MODULE} files={files} zipName="postkit-testo.zip" onClose={reset} />}
    </section>
  )
}
