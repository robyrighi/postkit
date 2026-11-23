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
  defaultFraming,
  drawCover,
  loadImage,
  makeCanvas,
  setSpacing,
  type FilterKey,
  type Framing,
  type Source,
} from '../lib/image'
import { drawBadge, drawOverlay, loadAllFonts, pickContrast } from '../lib/templates'
import { fmtDuration, humanDuration, parseTimeSmart } from '../lib/time'
import { drawRoute, readActivityFile } from '../lib/activityFile'

const MODULE = 'sport'

const SPORTS = [
  { id: 'run', emoji: '🏃', pace: true },
  { id: 'trail', emoji: '⛰️', pace: true },
  { id: 'xcski', emoji: '⛷️', pace: true },
  { id: 'bike', emoji: '🚴', pace: false },
  { id: 'mtb', emoji: '🚵', pace: false },
  { id: 'hike', emoji: '🥾', pace: true },
  { id: 'spin', emoji: '🔥', pace: false },
] as const
type SportId = (typeof SPORTS)[number]['id']

type Layout = 'classic' | 'bignum' | 'poster' | 'minimal'
const LAYOUTS: Layout[] = ['classic', 'bignum', 'poster', 'minimal']
const ACCENTS = ['#ffffff', '#fc5200', '#ffd400', '#80ed99', '#4cc9f0', '#ff7eb6']

interface Stat {
  value: string
  unit: string
  label: string
}

export function SportCard() {
  const { t, lang, locale } = useI18n()
  const [img, setImg] = useState<Source | null>(null)
  const [format, setFormat] = useState<FormatKey>('story')
  const [framing, setFraming] = useState<Framing>(defaultFraming)
  const [filter, setFilter] = useState<FilterKey>('none')
  const [sport, setSport] = useState<SportId>('run')
  const [layout, setLayout] = useState<Layout>('classic')
  const [accent, setAccent] = useState('#fc5200')
  const [titleRaw, setTitle] = useState<string | null>(null)
  const title = titleRaw ?? t('sport.defaultTitle')
  const [dateRaw, setDate] = useState<string | null>(null)
  const date = dateRaw ?? new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  const [km, setKm] = useState('10')
  const [time, setTime] = useState('52:30')
  const [elev, setElev] = useState('')
  const [hr, setHr] = useState('')
  const [kcal, setKcal] = useState('')
  const [power, setPower] = useState('')
  const [badge, setBadge] = useState(true)
  const [route, setRoute] = useState<[number, number][] | null>(null)
  const [showRoute, setShowRoute] = useState(true)
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const actInput = useRef<HTMLInputElement>(null)
  const [fontsOk, setFontsOk] = useState(false)
  const [files, setFiles] = useState<File[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const preview = useRef<HTMLCanvasElement>(null)
  const ensureProfile = useEnsureProfile()
  const sp = SPORTS.find((s) => s.id === sport)!
  const dec = (s: string) => (lang === 'en' ? s : s.replace('.', ','))
  const num = (s: string): number | null => {
    const n = parseFloat(s.replace(',', '.'))
    return isFinite(n) && n > 0 ? n : null
  }

  useEffect(() => {
    track(MODULE, 'open')
    loadAllFonts().then(() => setFontsOk(true))
  }, [])

  const reset = () => setFiles(null)

  async function onFile(f: File) {
    setError('')
    try {
      setImg(await loadImage(f))
      setFraming(defaultFraming)
      reset()
      track(MODULE, 'upload', { sample: /^(sport|text|panorama)\.jpg$/.test(f.name) })
    } catch {
      setError(t('common.openError'))
    }
  }

  async function onActivityFile(f: File) {
    try {
      const a = await readActivityFile(f)
      if (a.distanceKm) setKm(dec(a.distanceKm.toFixed(2).replace(/0$/, '')))
      if (a.durationSec) setTime(fmtDuration(a.durationSec))
      setElev(a.elevGain ? String(Math.round(a.elevGain)) : '')
      setHr(a.avgHr ? String(Math.round(a.avgHr)) : '')
      setKcal(a.kcal ? String(Math.round(a.kcal)) : '')
      setPower(a.avgPower ? String(Math.round(a.avgPower)) : '')
      if (a.date) setDate(a.date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }))
      if (a.sport) setSport(a.sport)
      if (a.name && titleRaw === null) setTitle(a.name.slice(0, 60))
      setRoute(a.points.length > 1 ? a.points : null)
      setShowRoute(true)
      setImportMsg({ ok: true, text: t('sport.importOk', { km: dec((a.distanceKm ?? 0).toFixed(1)), n: a.points.length }) })
      reset()
      track(MODULE, 'activity_import', { type: f.name.split('.').pop()?.toLowerCase(), points: a.points.length, sport: a.sport })
    } catch (e) {
      console.warn(e)
      setImportMsg({ ok: false, text: t('sport.importError') })
      track(MODULE, 'activity_import_error', { type: f.name.split('.').pop()?.toLowerCase() })
    }
  }

  const stats = useMemo<Stat[]>(() => {
    const out: Stat[] = []
    const d = num(km)
    const tt = parseTimeSmart(time, d, sport)
    if (d) out.push({ value: dec(Number.isInteger(d) ? String(d) : d.toFixed(1)), unit: 'km', label: t('sport.lbl.distance') })
    if (tt) out.push({ value: fmtDuration(tt), unit: '', label: t('sport.lbl.time') })
    if (d && tt) {
      if (sp.pace) out.push({ value: fmtDuration(tt / d), unit: '/km', label: t('sport.lbl.pace') })
      else out.push({ value: dec((d / (tt / 3600)).toFixed(1)), unit: 'km/h', label: t('sport.lbl.speed') })
    }
    const e = num(elev)
    if (e) out.push({ value: Math.round(e).toLocaleString(locale), unit: 'm', label: t('sport.lbl.elev') })
    const h = num(hr)
    if (h) out.push({ value: String(Math.round(h)), unit: 'bpm', label: t('sport.lbl.hr') })
    const pw = num(power)
    if (pw) out.push({ value: String(Math.round(pw)), unit: 'W', label: t('sport.lbl.power') })
    const kc = num(kcal)
    if (kc) out.push({ value: Math.round(kc).toLocaleString(locale), unit: 'kcal', label: t('sport.lbl.kcal') })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [km, time, elev, hr, kcal, power, sp.pace, sport, t, locale])

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
    const label = t(`sport.${sport}` as Key).toUpperCase()

    const statBlock = (x: number, y: number, s: Stat, valPx: number, color: string) => {
      ctx.textAlign = 'left'
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
        ctx.fillText(s.unit, x + vw + valPx * 0.12, y)
      }
    }

    const rw = Math.max(3, w * 0.0055)
    // il percorso occupa al massimo ~60% della larghezza, ancorato in basso nello spazio libero
    const routeIn = (y0: number, y1: number) => {
      if (!route || !showRoute || y1 - y0 < w * 0.15) return
      const bw = w * 0.6
      const bh = Math.min(y1 - y0, w * 0.55)
      drawRoute(ctx, route, { x: (w - bw) / 2, y: y1 - bh, w: bw, h: bh }, accent, rw)
    }

    if (layout === 'classic') {
      drawOverlay(ctx, w, h, 'bottom', 1.1)
      const cols = Math.min(stats.length, stats.length > 3 ? 2 : 3) || 1
      const rows = Math.ceil(stats.length / cols)
      const valPx = w * (cols === 3 ? 0.075 : 0.085)
      const rowH = valPx * 1.75
      const statsTop = h - m - rows * rowH
      routeIn(m * 1.2, statsTop - w * 0.27)
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
      const valPx = w * 0.075
      let yy = m + w * 0.04 + w * 0.34 + w * 0.13
      stats.slice(1).forEach((s) => {
        statBlock(m, yy, s, valPx, '#fff')
        yy += valPx * 1.7
      })
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = `600 ${Math.round(w * 0.03)}px "Inter", sans-serif`
      setSpacing(ctx, 0)
      ctx.textAlign = 'left'
      ctx.fillText(`${title} — ${date}`, m, yy + w * 0.01, w - 2 * m)
      routeIn(yy + w * 0.08, h - m * 1.5)
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
      const n = Math.max(1, Math.min(4, stats.length))
      const bandH = w * 0.27
      const by = h - bandH - m * 0.6
      routeIn(m + px * 0.85 + w * 0.12, by - w * 0.08)
      badgeBottom = by - w * 0.005
      ctx.fillStyle = accent
      ctx.fillRect(m * 0.6, by, w - m * 1.2, bandH)
      const ink = pickContrast(accent)
      const cw = (w - m * 1.2) / n
      const valPx = w * (n === 4 ? 0.062 : 0.078)
      stats.slice(0, 4).forEach((s, i) => {
        statBlock(m * 0.6 + cw * i + cw * 0.12, by + bandH / 2 + valPx * 0.75, s, valPx, ink)
      })
    } else {
      drawOverlay(ctx, w, h, 'bottom', 0.8)
      routeIn(m * 1.2, h - m - w * 0.3)
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
    if (badge) drawBadge(ctx, w, badgeBottom, t('common.badgeText'))
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
  }, [base, layout, accent, title, date, stats, badge, fontsOk, sport, t, route, showRoute])

  async function prepare() {
    const ok = await ensureProfile(MODULE)
    if (!ok) return
    setBusy(true)
    try {
      const c = compose()
      if (!c) return
      setFiles([await canvasToFile(c, `peakkit-sport-${stamp()}.jpg`)])
      track(MODULE, 'export', { format, layout, sport, filter, km: num(km), time, sec: tt })
    } catch {
      setError(t('common.genericError'))
    } finally {
      setBusy(false)
    }
  }

  const tt = parseTimeSmart(time, num(km), sport)

  return (
    <section className="module">
      <header className="module-head">
        <h1>{t('sport.title')}</h1>
        <p className="muted">{t('sport.lead')}</p>
      </header>

      {!img ? (
        <FilePick onFile={onFile} label={t('sport.pick')} sample="sport.jpg" />
      ) : (
        <div className="workspace">
          <div className={'stage ' + format}>
            <canvas ref={preview} className="preview" />
          </div>

          <div className="panel">
            <Field label={t('sport.step1')}>
              <div className="chips">
                {SPORTS.map((s) => (
                  <button
                    key={s.id}
                    className={'chip' + (sport === s.id ? ' on' : '')}
                    onClick={() => {
                      setSport(s.id)
                      if (s.id === 'spin' && km === '10') setKm('') // spinning: niente distanza di default
                      reset()
                      track(MODULE, 'sport', { s: s.id })
                    }}
                  >
                    {s.emoji} {t(`sport.${s.id}` as Key)}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={t('sport.step2')}>
              <input
                ref={actInput}
                type="file"
                accept=".gpx,.fit,application/gpx+xml"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onActivityFile(f)
                  e.target.value = ''
                }}
              />
              <button type="button" className="btn ghost import-btn" onClick={() => actInput.current?.click()}>
                {t('sport.import')}
              </button>
              {importMsg && <p className={importMsg.ok ? 'ok small' : 'error small'}>{importMsg.text}</p>}
              {!importMsg && <p className="muted small">{t('sport.importHint')}</p>}
              {route && (
                <label className="toggle">
                  <input type="checkbox" checked={showRoute} onChange={(e) => (setShowRoute(e.target.checked), reset())} />
                  <span className="toggle-ui" />
                  <span>{t('sport.showRoute')}</span>
                </label>
              )}
              <div className="grid2">
                <label>
                  {t('sport.distance')}
                  <input inputMode="decimal" value={km} onChange={(e) => (setKm(e.target.value), reset())} placeholder={t('sport.distPh')} />
                </label>
                <label>
                  {t('sport.time')}
                  <input
                    inputMode="numeric"
                    value={time}
                    onChange={(e) => (setTime(e.target.value), reset())}
                    placeholder={t('sport.timePh')}
                    className={time && !tt ? 'invalid' : ''}
                  />
                  {tt ? <span className="time-read">= {humanDuration(tt)}</span> : null}
                </label>
                <label>
                  {t('sport.elev')}
                  <input inputMode="numeric" value={elev} onChange={(e) => (setElev(e.target.value), reset())} placeholder={t('sport.optional')} />
                </label>
                <label>
                  {t('sport.hr')}
                  <input inputMode="numeric" value={hr} onChange={(e) => (setHr(e.target.value), reset())} placeholder={t('sport.optional')} />
                </label>
                <label>
                  {t('sport.power')}
                  <input inputMode="numeric" value={power} onChange={(e) => (setPower(e.target.value), reset())} placeholder={t('sport.optional')} />
                </label>
                <label>
                  {t('sport.kcal')}
                  <input inputMode="numeric" value={kcal} onChange={(e) => (setKcal(e.target.value), reset())} placeholder={t('sport.optional')} />
                </label>
              </div>
              <p className="muted small">{sport === 'spin' ? t('sport.hintSpin') : sp.pace ? t('sport.hintPace') : t('sport.hintSpeed')}</p>
            </Field>

            <Field label={t('sport.step3')}>
              <input value={title} maxLength={60} onChange={(e) => (setTitle(e.target.value), reset())} />
              <input value={date} maxLength={40} onChange={(e) => (setDate(e.target.value), reset())} />
            </Field>

            <Field label={t('sport.step4')}>
              <div className="chips">
                {LAYOUTS.map((l) => (
                  <button
                    key={l}
                    className={'chip' + (layout === l ? ' on' : '')}
                    onClick={() => (setLayout(l), reset(), track(MODULE, 'layout', { l }))}
                  >
                    {t(`sport.layout.${l}` as Key)}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={t('common.color')}>
              <ColorRow value={accent} onChange={(c) => (setAccent(c), reset())} colors={ACCENTS} />
            </Field>

            <details className="more">
              <summary>{t('sport.more')}</summary>
              <Field label={t('sport.format')}>
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
              <Slider
                label={t('common.zoom')}
                value={framing.zoom}
                min={1}
                max={2.5}
                onChange={(zoom) => (setFraming({ ...framing, zoom }), reset())}
              />
              <Slider label={t('common.moveH')} value={framing.x} min={-1} max={1} onChange={(x) => (setFraming({ ...framing, x }), reset())} />
              <Slider label={t('common.moveV')} value={framing.y} min={-1} max={1} onChange={(y) => (setFraming({ ...framing, y }), reset())} />
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
              <button className="btn primary big" onClick={prepare} disabled={busy}>
                {busy ? t('common.preparing') : t('sport.create')}
              </button>
              <FilePick onFile={onFile} label={t('common.changePhoto')} compact />
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}
      {error && !img && <p className="error">{error}</p>}
      {files && <ExportPanel module={MODULE} files={files} zipName="peakkit-sport.zip" onClose={reset} />}
    </section>
  )
}
