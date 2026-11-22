import { useEffect, useRef, useState } from 'react'
import { ExportPanel } from '../components/ExportPanel'
import { Field, FilePick, FilterChips, Segmented, Slider } from '../components/Controls'
import { useEnsureProfile } from '../components/ProfileGate'
import { useI18n } from '../i18n'
import { track } from '../lib/api'
import { canvasToFile, stamp } from '../lib/exporter'
import {
  applyFilter,
  ctx2d,
  defaultFraming,
  drawCover,
  loadImage,
  makeCanvas,
  srcSize,
  type FilterKey,
  type Framing,
  type Source,
} from '../lib/image'

const MODULE = 'carousel'
type Ratio = 'post' | 'square'
const SLIDE = { post: { w: 1080, h: 1350 }, square: { w: 1080, h: 1080 } }

/** Numero di slide consigliato in base alla forma della foto. */
function suggestSlides(img: Source, ratio: Ratio) {
  const s = srcSize(img)
  const slide = SLIDE[ratio]
  const n = Math.round(s.w / s.h / (slide.w / slide.h))
  return Math.min(10, Math.max(2, n))
}

export function CarouselSplitter() {
  const { t } = useI18n()
  const [img, setImg] = useState<Source | null>(null)
  const [ratio, setRatio] = useState<Ratio>('post')
  const [slides, setSlides] = useState(3)
  const [framing, setFraming] = useState<Framing>(defaultFraming)
  const [filter, setFilter] = useState<FilterKey>('none')
  const [files, setFiles] = useState<File[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const preview = useRef<HTMLCanvasElement>(null)
  const ensureProfile = useEnsureProfile()

  useEffect(() => {
    track(MODULE, 'open')
  }, [])

  async function onFile(f: File) {
    setError('')
    try {
      const im = await loadImage(f)
      setImg(im)
      setSlides(suggestSlides(im, ratio))
      setFraming(defaultFraming)
      setFiles(null)
      const s = srcSize(im)
      track(MODULE, 'upload', { w: s.w, h: s.h })
    } catch {
      setError(t('common.openError'))
    }
  }

  function renderStrip(scale = 1): HTMLCanvasElement {
    const sl = SLIDE[ratio]
    const c = makeCanvas(Math.round(sl.w * slides * scale), Math.round(sl.h * scale))
    const ctx = ctx2d(c)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, c.width, c.height)
    if (img) drawCover(ctx, img, c.width, c.height, framing)
    applyFilter(c, filter)
    return c
  }

  // Anteprima: striscia intera ridotta con le linee di taglio
  useEffect(() => {
    if (!img || !preview.current) return
    const sl = SLIDE[ratio]
    const scale = Math.min(1, 2400 / (sl.w * slides))
    const strip = renderStrip(scale)
    const c = preview.current
    c.width = strip.width
    c.height = strip.height
    const ctx = ctx2d(c)
    ctx.drawImage(strip, 0, 0)
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = Math.max(2, 3 * scale)
    ctx.setLineDash([12 * scale + 6, 8 * scale + 4])
    const w = c.width / slides
    for (let i = 1; i < slides; i++) {
      ctx.beginPath()
      ctx.moveTo(i * w, 0)
      ctx.lineTo(i * w, c.height)
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.font = `700 ${Math.round(c.height / 14)}px Inter, sans-serif`
    ctx.textAlign = 'center'
    for (let i = 0; i < slides; i++) {
      const x = i * w + w / 2
      const y = c.height - c.height / 18
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.beginPath()
      ctx.arc(x, y - c.height / 40, c.height / 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText(String(i + 1), x, y)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, ratio, slides, framing, filter])

  async function prepare() {
    if (!img) return
    const ok = await ensureProfile()
    if (!ok) return
    setBusy(true)
    try {
      const strip = renderStrip(1)
      const sl = SLIDE[ratio]
      const out: File[] = []
      const base = `postkit-carousel-${stamp()}`
      for (let i = 0; i < slides; i++) {
        const c = makeCanvas(sl.w, sl.h)
        ctx2d(c).drawImage(strip, i * sl.w, 0, sl.w, sl.h, 0, 0, sl.w, sl.h)
        out.push(await canvasToFile(c, `${base}-${String(i + 1).padStart(2, '0')}.jpg`))
      }
      setFiles(out)
      track(MODULE, 'export', { slides, ratio, filter })
    } catch {
      setError(t('common.genericError'))
    } finally {
      setBusy(false)
    }
  }

  const reset = () => setFiles(null)

  return (
    <section className="module">
      <header className="module-head">
        <h1>{t('car.title')}</h1>
        <p className="muted">{t('car.lead')}</p>
      </header>

      {!img ? (
        <FilePick onFile={onFile} label={t('car.pick')} />
      ) : (
        <div className="workspace">
          <div className="stage strip">
            <canvas ref={preview} className="preview" />
          </div>

          <div className="panel">
            <Field label={t('car.step1')}>
              <Segmented
                value={ratio}
                onChange={(v) => {
                  setRatio(v)
                  setSlides(suggestSlides(img, v))
                  reset()
                }}
                options={[
                  { value: 'post', label: t('car.portrait') },
                  { value: 'square', label: t('car.square') },
                ]}
              />
            </Field>

            <Field label={t('car.step2')}>
              <div className="stepper">
                <button className="btn ghost" onClick={() => (setSlides(Math.max(2, slides - 1)), reset())} aria-label="−">
                  −
                </button>
                <span className="stepper-val">{slides}</span>
                <button className="btn ghost" onClick={() => (setSlides(Math.min(10, slides + 1)), reset())} aria-label="+">
                  +
                </button>
              </div>
            </Field>

            <Slider
              label={t('car.step3')}
              value={framing.zoom}
              min={1}
              max={2.5}
              onChange={(zoom) => (setFraming({ ...framing, zoom }), reset())}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Slider label={t('car.moveH')} value={framing.x} min={-1} max={1} onChange={(x) => (setFraming({ ...framing, x }), reset())} />
            <Slider label={t('car.moveV')} value={framing.y} min={-1} max={1} onChange={(y) => (setFraming({ ...framing, y }), reset())} />

            <Field label={t('car.step4')}>
              <FilterChips
                value={filter}
                onChange={(f) => {
                  setFilter(f)
                  reset()
                  track(MODULE, 'filter', { f })
                }}
              />
            </Field>

            <div className="row wrap">
              <button className="btn primary big" onClick={prepare} disabled={busy}>
                {busy ? t('common.preparing') : t('car.create', { n: slides })}
              </button>
              <FilePick onFile={onFile} label={t('common.changePhoto')} compact />
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}
      {error && !img && <p className="error">{error}</p>}

      {files && <ExportPanel module={MODULE} files={files} zipName="postkit-carousel.zip" onClose={reset} />}
    </section>
  )
}
