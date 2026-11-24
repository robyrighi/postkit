import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useI18n, type Key } from '../i18n'
import { track } from '../lib/api'
import { drawCover, makeCanvas, type Framing, type Source } from '../lib/image'
import { applyBackground, autoEnhance, BG_MODES, eraseRegion, type BgMode } from '../lib/retouch'
import { subjectMask } from '../lib/segment'
import { Field, Slider } from './Controls'

interface Opts {
  module: string
  img: Source | null
  width: number
  height: number
  framing: Framing
  /** Sostituisce la foto con quella ritoccata (già inquadrata alle dimensioni finali) */
  onBake: (img: Source, framing: Framing) => void
  onChange: () => void
}

/** Stato e operazioni del ritocco IA locale, condivisi tra Card sport e Testo. */
export function useRetouch(o: Opts) {
  const [enhance, setEnhance] = useState(false)
  const [bg, setBg] = useState<BgMode>('none')
  const [mask, setMask] = useState<HTMLCanvasElement | null>(null)
  const [segBusy, setSegBusy] = useState(false)
  const [segError, setSegError] = useState(false)
  const [eraseMode, setEraseMode] = useState(false)
  const [brush, setBrush] = useState(0.045)
  const [paintVer, setPaintVer] = useState(0)
  const [erasing, setErasing] = useState<null | { phase: 'download' | 'work'; p: number }>(null)
  const [eraseError, setEraseError] = useState(false)
  const [undo, setUndo] = useState<{ img: Source; framing: Framing }[]>([])
  const paint = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef<{ x: number; y: number } | null>(null)
  const optsRef = useRef(o)
  optsRef.current = o

  const framedRaw = () => {
    const { img, width, height, framing } = optsRef.current
    if (!img) return null
    const c = makeCanvas(width, height)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, width, height)
    drawCover(ctx, img, width, height, framing)
    return c
  }

  // Maschera della persona per lo sfondo: si ricalcola quando cambia foto/inquadratura
  const needMask = bg !== 'none'
  useEffect(() => {
    setMask(null)
    if (!needMask || !o.img) return
    let alive = true
    const id = setTimeout(async () => {
      const f = framedRaw()
      if (!f) return
      setSegBusy(true)
      setSegError(false)
      try {
        const m = await subjectMask(f)
        if (alive) setMask(m)
      } catch {
        if (alive) setSegError(true)
      } finally {
        if (alive) setSegBusy(false)
      }
    }, 200)
    return () => {
      alive = false
      clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needMask, o.img, o.width, o.height, o.framing])

  // La zona dipinta vale solo per l'inquadratura corrente
  useEffect(() => {
    paint.current = null
    setPaintVer((v) => v + 1)
  }, [o.img, o.width, o.height, o.framing])

  /** Applica migliora/sfondo al canvas già inquadrato (prima dei filtri). */
  function process(framed: HTMLCanvasElement): HTMLCanvasElement {
    let c = framed
    if (enhance) autoEnhance(c)
    if (bg !== 'none' && mask) c = applyBackground(c, mask, bg)
    return c
  }

  function ensurePaint() {
    if (!paint.current || paint.current.width !== o.width || paint.current.height !== o.height) {
      paint.current = makeCanvas(o.width, o.height)
    }
    return paint.current
  }

  function toCanvas(e: PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * o.width, y: ((e.clientY - r.top) / r.height) * o.height }
  }

  function stroke(a: { x: number; y: number }, b: { x: number; y: number }) {
    const ctx = ensurePaint().getContext('2d')!
    ctx.strokeStyle = 'rgba(255,60,90,1)'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(8, brush * o.width)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x + 0.01, b.y)
    ctx.stroke()
    setPaintVer((v) => v + 1)
  }

  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLCanvasElement>) => {
      if (!eraseMode || erasing) return
      e.currentTarget.setPointerCapture(e.pointerId)
      const p = toCanvas(e)
      drawing.current = p
      stroke(p, p)
    },
    onPointerMove: (e: PointerEvent<HTMLCanvasElement>) => {
      if (!eraseMode || !drawing.current) return
      const p = toCanvas(e)
      stroke(drawing.current, p)
      drawing.current = p
    },
    onPointerUp: () => {
      drawing.current = null
    },
  }

  /** Disegna in anteprima le zone dipinte (rosso semitrasparente). */
  function drawPaintPreview(ctx: CanvasRenderingContext2D) {
    if (!eraseMode || !paint.current) return
    ctx.save()
    ctx.globalAlpha = 0.55
    ctx.drawImage(paint.current, 0, 0)
    ctx.restore()
  }

  function clearPaint() {
    paint.current = null
    setPaintVer((v) => v + 1)
  }

  async function applyErase() {
    const p = paint.current
    const f = framedRaw()
    if (!p || !f || !o.img) return
    setEraseError(false)
    setErasing({ phase: 'download', p: 0 })
    const t0 = performance.now()
    try {
      const out = await eraseRegion(f, p, (x) => setErasing((s) => (s && s.phase === 'download' ? { phase: x >= 1 ? 'work' : 'download', p: x } : s)))
      setUndo((u) => [...u.slice(-4), { img: o.img!, framing: o.framing }])
      paint.current = null
      o.onBake(out, { zoom: 1, x: 0, y: 0 })
      o.onChange()
      track(o.module, 'ai_erase', { ms: Math.round(performance.now() - t0) })
    } catch (e) {
      setEraseError(true)
      track(o.module, 'ai_erase_error', { msg: String((e as Error)?.message).slice(0, 80) })
    } finally {
      setErasing(null)
    }
  }

  function undoErase() {
    const last = undo[undo.length - 1]
    if (!last) return
    setUndo(undo.slice(0, -1))
    o.onBake(last.img, last.framing)
    o.onChange()
  }

  return {
    enhance,
    setEnhance,
    bg,
    setBg,
    mask,
    segBusy,
    segError,
    eraseMode,
    setEraseMode,
    brush,
    setBrush,
    paintVer,
    hasPaint: !!paint.current,
    erasing,
    eraseError,
    canUndo: undo.length > 0,
    process,
    handlers,
    drawPaintPreview,
    clearPaint,
    applyErase,
    undoErase,
    /** cambia quando l'anteprima va ridisegnata */
    key: `${enhance}|${bg}|${mask ? 1 : 0}`,
  }
}

export type RetouchState = ReturnType<typeof useRetouch>

export function AiTools({ rt, module, onChange }: { rt: RetouchState; module: string; onChange: () => void }) {
  const { t } = useI18n()
  return (
    <Field label={t('ai.title')} hint={t('ai.local')}>
      <label className="toggle">
        <input
          type="checkbox"
          checked={rt.enhance}
          onChange={(e) => {
            rt.setEnhance(e.target.checked)
            onChange()
            if (e.target.checked) track(module, 'ai_enhance')
          }}
        />
        <span className="toggle-ui" />
        <span>✨ {t('ai.enhance')}</span>
      </label>

      <div className="ai-row">
        <span className="ai-label">📸 {t('ai.bg')}</span>
        <div className="chips">
          {BG_MODES.map((m) => (
            <button
              key={m}
              className={'chip' + (rt.bg === m ? ' on' : '')}
              onClick={() => {
                rt.setBg(m)
                onChange()
                if (m !== 'none') track(module, 'ai_bg', { m })
              }}
            >
              {t(`ai.bg.${m}` as Key)}
            </button>
          ))}
        </div>
        {rt.bg !== 'none' && rt.segBusy && <p className="muted small">⏳ {t('ai.segBusy')}</p>}
        {rt.bg !== 'none' && rt.segError && <p className="error small">{t('text.aiError')}</p>}
      </div>

      {!rt.eraseMode ? (
        <div className="row wrap">
          <button className="btn ghost" onClick={() => (rt.setEraseMode(true), track(module, 'ai_erase_open'))}>
            🪄 {t('ai.erase')}
          </button>
          {rt.canUndo && (
            <button className="btn ghost small" onClick={rt.undoErase}>
              ↩︎ {t('ai.undo')}
            </button>
          )}
        </div>
      ) : (
        <div className="erase-box">
          <p>
            <strong>🪄 {t('ai.erase')}</strong> — {t('ai.eraseHint')}
          </p>
          <Slider label={t('ai.brush')} value={rt.brush} min={0.015} max={0.12} step={0.005} onChange={rt.setBrush} />
          {rt.erasing ? (
            <p className="muted">
              ⏳{' '}
              {rt.erasing.phase === 'download'
                ? t('ai.downloading', { p: Math.round(rt.erasing.p * 100) })
                : t('ai.working')}
            </p>
          ) : (
            <div className="row wrap">
              <button className="btn primary" disabled={!rt.hasPaint} onClick={rt.applyErase}>
                {t('ai.eraseNow')}
              </button>
              <button className="btn ghost small" disabled={!rt.hasPaint} onClick={rt.clearPaint}>
                {t('ai.clear')}
              </button>
              {rt.canUndo && (
                <button className="btn ghost small" onClick={rt.undoErase}>
                  ↩︎ {t('ai.undo')}
                </button>
              )}
              <button className="btn ghost small" onClick={() => (rt.setEraseMode(false), rt.clearPaint())}>
                {t('ai.done')}
              </button>
            </div>
          )}
          {rt.eraseError && <p className="error small">{t('ai.eraseError')}</p>}
          <p className="muted small">{t('ai.eraseNote')}</p>
        </div>
      )}
    </Field>
  )
}
