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
  defaultFraming,
  drawCover,
  FILTERS,
  loadImage,
  makeCanvas,
  setSpacing,
  type FilterKey,
  type Framing,
  type Source,
} from '../lib/image'
import { drawBadge, drawOverlay, loadAllFonts, pickContrast } from '../lib/templates'

const MODULE = 'sport'

const SPORTS = [
  { id: 'run', label: 'Corsa', emoji: '🏃', pace: true },
  { id: 'trail', label: 'Trail', emoji: '⛰️', pace: true },
  { id: 'xcski', label: 'Sci di fondo', emoji: '⛷️', pace: true },
  { id: 'bike', label: 'Bici', emoji: '🚴', pace: false },
  { id: 'hike', label: 'Escursione', emoji: '🥾', pace: true },
] as const
type SportId = (typeof SPORTS)[number]['id']

type Layout = 'classic' | 'bignum' | 'poster' | 'minimal'
const LAYOUTS: { id: Layout; label: string }[] = [
  { id: 'classic', label: 'Classico' },
  { id: 'bignum', label: 'Grandi numeri' },
  { id: 'poster', label: 'Poster' },
  { id: 'minimal', label: 'Minimal' },
]
const ACCENTS = ['#ffffff', '#fc5200', '#ffd400', '#80ed99', '#4cc9f0', '#ff7eb6']

/** "1:23:45", "45:30" oppure "52" (minuti) → secondi */
export function parseDuration(s: string): number | null {
  const t = s.trim().replace(/[.,]/g, ':')
  if (!t) return null
  const parts = t.split(':').map((p) => parseInt(p, 10))
  if (parts.some((p) => isNaN(p) || p < 0)) return null
  if (parts.length === 1) return parts[0] * 60
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.round(sec % 60)
  const p = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`
}

function num(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'))
  return isFinite(n) && n > 0 ? n : null
}

interface Stat {
  value: string
  unit: string
  label: string
}

export function SportCard() {
  const [img, setImg] = useState<Source | null>(null)
  const [format, setFormat] = useState<FormatKey>('story')
  const [framing, setFraming] = useState<Framing>(defaultFraming)
  const [filter, setFilter] = useState<FilterKey>('none')
  const [sport, setSport] = useState<SportId>('run')
  const [layout, setLayout] = useState<Layout>('classic')
  const [accent, setAccent] = useState('#fc5200')
  const [title, setTitle] = useState('Uscita del mattino')
  const [date, setDate] = useState(() => new Date().toLocaleDateString('it-CH', { day: 'numeric', month: 'long', year: 'numeric' }))
  const [km, setKm] = useState('10')
  const [time, setTime] = useState('52:30')
  const [elev, setElev] = useState('')
  const [hr, setHr] = useState('')
  const [badge, setBadge] = useState(true)
  const [fontsOk, setFontsOk] = useState(false)
  const [files, setFiles] = useState<File[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const preview = useRef<HTMLCanvasElement>(null)
  const ensureProfile = useEnsureProfile()
  const sp = SPORTS.find((s) => s.id === sport)!

  useEffect(() => {
    track(MODULE, 'open')
    loadAllFonts().then(() => setFontsOk(true))
  }, [])

  async function onFile(f: File) {
    setError('')
    try {
      setImg(await loadImage(f))
      setFraming(defaultFraming)
      setFiles(null)
      track(MODULE, 'upload')
    } catch {
      setError('Non riesco ad aprire questa foto. Prova con un JPG o PNG.')
    }
  }

  const stats = useMemo<Stat[]>(() => {
    const out: Stat[] = []
    const d = num(km)
    const t = parseDuration(time)
    if (d) out.push({ value: d.toFixed(d < 100 ? (Number.isInteger(d) ? 0 : 1) : 0).replace('.', ','), unit: 'km', label: 'Distanza' })
    if (t) out.push({ value: fmtDuration(t), unit: '', label: 'Tempo' })
    if (d && t) {
      if (sp.pace) out.push({ value: fmtDuration(t / d), unit: '/km', label: 'Passo' })
      else out.push({ value: (d / (t / 3600)).toFixed(1).replace('.', ','), unit: 'km/h', label: 'Velocità' })
    }
    const e = num(elev)
    if (e) out.push({ value: Math.round(e).toLocaleString('it-CH'), unit: 'm', label: 'Dislivello +' })
    const h = num(hr)
    if (h) out.push({ value: String(Math.round(h)), unit: 'bpm', label: 'FC media' })
    return out
  }, [km, time, elev, hr, sp.pace])

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

  function compose(): HTMLCanvasElement | null {
    if (!base) return null
    const { w, h } = FORMATS[format]
    const c = makeCanvas(w, h)
    const ctx = ctx2d(c)
    ctx.drawImage(base, 0, 0)
    const m = w * 0.07
    let badgeBottom = h
    const label = sp.label.toUpperCase()

    const statBlock = (x: number, y: number, s: Stat, valPx: number, color: string, align: CanvasTextAlign = 'left') => {
      ctx.textAlign = align
      ctx.fillStyle = color
      ctx.font = `600 ${Math.round(valPx * 0.32)}px "Montserrat", sans-serif`
      setSpacing(ctx, valPx * 0.04)
      ctx.globalAlpha = 0.8
      ctx.fillText(s.label.toUpperCase(), x, y - valPx * 1.02)
      ctx.globalAlpha = 1
      ctx.font = `700 ${Math.round(valPx)}px "Oswald", sans-serif`
      setSpacing(ctx, 0)
      const vw = ctx.measureText(s.value).width
      ctx.fillText(s.value, x, y)
      if (s.unit) {
        ctx.font = `500 ${Math.round(valPx * 0.42)}px "Oswald", sans-serif`
        const ux = align === 'left' ? x + vw + valPx * 0.12 : align === 'center' ? x + vw / 2 + valPx * 0.1 : x
        ctx.textAlign = 'left'
        ctx.fillText(s.unit, ux, y)
      }
    }

    if (layout === 'classic') {
      drawOverlay(ctx, w, h, 'bottom', 1.1)
      const cols = Math.min(stats.length, stats.length > 3 ? 2 : 3) || 1
      const rows = Math.ceil(stats.length / cols)
      const valPx = w * (cols === 3 ? 0.075 : 0.085)
      const rowH = valPx * 1.75
      const statsTop = h - m - rows * rowH
      // titolo
      ctx.textAlign = 'left'
      ctx.fillStyle = accent
      ctx.font = `700 ${Math.round(w * 0.03)}px "Montserrat", sans-serif`
      setSpacing(ctx, w * 0.006)
      ctx.fillText(`${label}  ·  ${date.toUpperCase()}`, m, statsTop - w * 0.17)
      ctx.fillStyle = '#fff'
      ctx.font = `800 ${Math.round(w * 0.075)}px "Inter", sans-serif`
      setSpacing(ctx, -w * 0.002)
      ctx.fillText(title, m, statsTop - w * 0.075, w - 2 * m)
      ctx.fillStyle = accent
      ctx.fillRect(m, statsTop - w * 0.045, w * 0.12, w * 0.008)
      stats.forEach((s, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = m + col * ((w - 2 * m) / cols)
        statBlock(x, statsTop + row * rowH + valPx * 1.25, s, valPx, '#fff')
      })
    } else if (layout === 'bignum') {
      drawOverlay(ctx, w, h, 'top', 1.2)
      const main = stats[0]
      ctx.textAlign = 'left'
      ctx.fillStyle = accent
      ctx.font = `700 ${Math.round(w * 0.032)}px "Montserrat", sans-serif`
      setSpacing(ctx, w * 0.008)
      ctx.fillText(label, m, m + w * 0.04)
      if (main) {
        const px = w * 0.34
        ctx.fillStyle = '#fff'
        ctx.font = `400 ${Math.round(px)}px "Bebas Neue", sans-serif`
        setSpacing(ctx, 0)
        ctx.fillText(main.value, m - px * 0.02, m + w * 0.04 + px * 0.92)
        const vw = ctx.measureText(main.value).width
        ctx.font = `400 ${Math.round(px * 0.3)}px "Bebas Neue", sans-serif`
        ctx.fillStyle = accent
        ctx.fillText(main.unit.toUpperCase(), m + vw + px * 0.04, m + w * 0.04 + px * 0.92)
      }
      const rest = stats.slice(1)
      const valPx = w * 0.075
      let yy = m + w * 0.04 + w * 0.34 + w * 0.13
      rest.forEach((s) => {
        statBlock(m, yy, s, valPx, '#fff')
        yy += valPx * 1.7
      })
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = `600 ${Math.round(w * 0.03)}px "Inter", sans-serif`
      setSpacing(ctx, 0)
      ctx.textAlign = 'left'
      ctx.fillText(`${title} — ${date}`, m, yy + w * 0.01, w - 2 * m)
    } else if (layout === 'poster') {
      drawOverlay(ctx, w, h, 'top', 0.9)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#fff'
      let px = w * 0.17
      ctx.font = `400 ${Math.round(px)}px "Bebas Neue", sans-serif`
      const tw = ctx.measureText(title.toUpperCase()).width
      if (tw > w - 2 * m) {
        px *= (w - 2 * m) / tw
        ctx.font = `400 ${Math.round(px)}px "Bebas Neue", sans-serif`
      }
      ctx.shadowColor = 'rgba(0,0,0,0.35)'
      ctx.shadowBlur = px * 0.15
      ctx.fillText(title.toUpperCase(), w / 2, m + px * 0.85)
      ctx.shadowBlur = 0
      ctx.font = `600 ${Math.round(w * 0.028)}px "Montserrat", sans-serif`
      setSpacing(ctx, w * 0.01)
      ctx.fillText(`${label} · ${date.toUpperCase()}`, w / 2 + w * 0.005, m + px * 0.85 + w * 0.06)
      setSpacing(ctx, 0)
      // fascia statistiche
      const n = Math.max(1, Math.min(4, stats.length))
      const bandH = w * 0.27
      const by = h - bandH - m * 0.6
      ctx.fillStyle = accent
      ctx.fillRect(m * 0.6, by, w - m * 1.2, bandH)
      badgeBottom = by - w * 0.005
      const ink = pickContrast(accent)
      const cw = (w - m * 1.2) / n
      const valPx = w * (n === 4 ? 0.062 : 0.078)
      stats.slice(0, 4).forEach((s, i) => {
        statBlock(m * 0.6 + cw * i + cw * 0.12, by + bandH / 2 + valPx * 0.75, s, valPx, ink)
      })
    } else {
      drawOverlay(ctx, w, h, 'bottom', 0.8)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#fff'
      ctx.font = `700 ${Math.round(w * 0.05)}px "Inter", sans-serif`
      ctx.fillText(title, w / 2, h - m - w * 0.12, w - 2 * m)
      const line = stats.map((s) => `${s.value}${s.unit ? ' ' + s.unit : ''}`).join('   ·   ')
      ctx.font = `500 ${Math.round(w * 0.034)}px "Inter", sans-serif`
      ctx.globalAlpha = 0.95
      ctx.fillText(line, w / 2, h - m - w * 0.05, w - 2 * m)
      ctx.fillStyle = accent
      ctx.font = `700 ${Math.round(w * 0.024)}px "Montserrat", sans-serif`
      setSpacing(ctx, w * 0.006)
      ctx.fillText(`${label} · ${date.toUpperCase()}`, w / 2, h - m - w * 0.2)
      ctx.globalAlpha = 1
      setSpacing(ctx, 0)
    }
    if (badge) drawBadge(ctx, w, badgeBottom)
    return c
  }

  useEffect(() => {
    const c = compose()
    if (!c || !preview.current) return
    const p = preview.current
    p.width = c.width
    p.height = c.height
    ctx2d(p).drawImage(c, 0, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, layout, accent, title, date, stats, badge, fontsOk, sport])

  async function prepare() {
    const ok = await ensureProfile()
    if (!ok) return
    setBusy(true)
    try {
      const c = compose()
      if (!c) return
      setFiles([await canvasToFile(c, `postkit-sport-${stamp()}.jpg`)])
      track(MODULE, 'export', { format, layout, sport, filter })
    } catch {
      setError('Qualcosa è andato storto. Riprova.')
    } finally {
      setBusy(false)
    }
  }

  const reset = () => setFiles(null)
  const t = parseDuration(time)

  return (
    <section className="module">
      <header className="module-head">
        <h1>Card della tua uscita</h1>
        <p className="muted">
          La foto della corsa, della sciata o del giro in bici, con i tuoi numeri impaginati come si deve. Pronta per storia o
          post.
        </p>
      </header>

      {!img ? (
        <FilePick onFile={onFile} label="Scegli la foto dell’uscita" />
      ) : (
        <div className="workspace">
          <div className={'stage ' + format}>
            <canvas ref={preview} className="preview" />
          </div>

          <div className="panel">
            <Field label="1 · Sport">
              <div className="chips">
                {SPORTS.map((s) => (
                  <button key={s.id} className={'chip' + (sport === s.id ? ' on' : '')} onClick={() => (setSport(s.id), reset())}>
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="2 · I tuoi numeri">
              <div className="grid2">
                <label>
                  Distanza (km)
                  <input inputMode="decimal" value={km} onChange={(e) => (setKm(e.target.value), reset())} placeholder="es. 10,5" />
                </label>
                <label>
                  Tempo
                  <input
                    inputMode="numeric"
                    value={time}
                    onChange={(e) => (setTime(e.target.value), reset())}
                    placeholder="es. 1:05:30"
                    className={time && !t ? 'invalid' : ''}
                  />
                </label>
                <label>
                  Dislivello + (m)
                  <input inputMode="numeric" value={elev} onChange={(e) => (setElev(e.target.value), reset())} placeholder="facoltativo" />
                </label>
                <label>
                  FC media (bpm)
                  <input inputMode="numeric" value={hr} onChange={(e) => (setHr(e.target.value), reset())} placeholder="facoltativo" />
                </label>
              </div>
              <p className="muted small">
                {sp.pace ? 'Il passo' : 'La velocità media'} si calcola da solo. Tempo: “52:30” oppure “1:05:30”.
              </p>
            </Field>

            <Field label="3 · Titolo">
              <input value={title} maxLength={60} onChange={(e) => (setTitle(e.target.value), reset())} />
              <input value={date} maxLength={40} onChange={(e) => (setDate(e.target.value), reset())} />
            </Field>

            <Field label="4 · Impaginazione">
              <div className="chips">
                {LAYOUTS.map((l) => (
                  <button key={l.id} className={'chip' + (layout === l.id ? ' on' : '')} onClick={() => (setLayout(l.id), reset())}>
                    {l.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Colore">
              <ColorRow value={accent} onChange={(c) => (setAccent(c), reset())} colors={ACCENTS} />
            </Field>

            <details className="more">
              <summary>Formato, foto e filtri</summary>
              <Field label="Formato">
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
              <Slider label="Zoom foto" value={framing.zoom} min={1} max={2.5} onChange={(zoom) => (setFraming({ ...framing, zoom }), reset())} />
              <Slider label="Sposta foto ↔" value={framing.x} min={-1} max={1} onChange={(x) => (setFraming({ ...framing, x }), reset())} />
              <Slider label="Sposta foto ↕" value={framing.y} min={-1} max={1} onChange={(y) => (setFraming({ ...framing, y }), reset())} />
              <Field label="Filtro">
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
              <button className="btn primary big" onClick={prepare} disabled={busy}>
                {busy ? 'Preparo…' : '✨ Crea card'}
              </button>
              <FilePick onFile={onFile} label="Cambia foto" compact />
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}
      {error && !img && <p className="error">{error}</p>}
      {files && <ExportPanel module={MODULE} files={files} zipName="postkit-sport.zip" onClose={reset} />}
    </section>
  )
}
