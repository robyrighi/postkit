import { useEffect, useMemo, useRef, useState } from 'react'
import { ColorRow, Field, FilePick, FilterChips, Segmented, Slider } from '../components/Controls'
import { ExportPanel } from '../components/ExportPanel'
import { useVideo, VideoTrim } from '../components/VideoControls'
import { AiTools, useRetouch } from '../components/AiTools'
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
import { fmtDuration, humanDuration, parseDuration, parseTimeSmart } from '../lib/time'
import { drawRoute, readActivityFile } from '../lib/activityFile'
import type { OcrProgress } from '../lib/ocr'

// iOS rende grigi i .fit/.gpx se il campo file filtra per estensione: lì niente filtro
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
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

// Colori zone cardiache (come Garmin): Z1 … Z5
const ZONE_COLORS = ['#e9e6f0', '#3b8cff', '#3ecf6b', '#ff7a2f', '#ff3b4e']

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
  const [zones, setZones] = useState<string[]>(['', '', '', '', ''])
  const [te, setTe] = useState('')
  const [showZones, setShowZones] = useState(true)
  const [route, setRoute] = useState<[number, number][] | null>(null)
  const [showRoute, setShowRoute] = useState(true)
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const shotInput = useRef<HTMLInputElement>(null)
  const [ocr, setOcr] = useState<OcrProgress | null>(null)
  const actInput = useRef<HTMLInputElement>(null)
  const [fontsOk, setFontsOk] = useState(false)
  const [files, setFiles] = useState<File[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const preview = useRef<HTMLCanvasElement>(null)
  const vid = useVideo((c) => setImg(c))
  const rt = useRetouch({
    module: MODULE,
    img: vid.isVideo ? null : img,
    width: FORMATS[format].w,
    height: FORMATS[format].h,
    framing,
    onBake: (im, f) => (setImg(im), setFraming(f)),
    onChange: () => setFiles(null),
  })
  const ensureProfile = useEnsureProfile()
  const sp = SPORTS.find((s) => s.id === sport)!
  const dec = (s: string) => (lang === 'en' ? s : s.replace('.', ','))
  const num = (s: string): number | null => {
    const n = parseFloat(s.replace(',', '.'))
    return isFinite(n) && n > 0 ? n : null
  }

  const [isSample, setIsSample] = useState(false)

  useEffect(() => {
    track(MODULE, 'open')
    loadAllFonts().then(() => setFontsOk(true))
    // Arrivo da "Guarda un esempio" in home: carica subito la foto d'esempio
    let demo = false
    try {
      demo = sessionStorage.getItem('pk_demo') === 'sport'
      sessionStorage.removeItem('pk_demo')
    } catch {
      /* storage non disponibile */
    }
    if (demo) {
      fetch(`${import.meta.env.BASE_URL}samples/sport.jpg`)
        .then((r) => r.blob())
        .then((b) => onFile(new File([b], 'sport.jpg', { type: 'image/jpeg' })))
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reset = () => setFiles(null)

  async function onFile(f: File) {
    setError('')
    if (vid.isVideoFile(f)) {
      try {
        const poster = await vid.open(f)
        setImg(poster)
        setFilter('none')
        setFraming(defaultFraming)
        setIsSample(false)
        reset()
        track(MODULE, 'upload', { video: true, mb: Math.round(f.size / 1e6) })
      } catch (e) {
        setError((e as Error).message === 'unsupported' ? t('video.unsupported') : t('common.openError'))
        track(MODULE, 'video_error', { stage: 'open', msg: String((e as Error).message).slice(0, 80) })
      }
      return
    }
    vid.clear()
    try {
      setImg(await loadImage(f))
      setFraming(defaultFraming)
      reset()
      const sample = /^(sport|text|panorama)\.jpg$/.test(f.name)
      setIsSample(sample)
      track(MODULE, 'upload', { sample })
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
      setZones(a.hrZones ? a.hrZones.map((v) => (v >= 1 ? fmtDuration(Math.round(v)) : '')) : ['', '', '', '', ''])
      setTe(a.teAerobic ? dec(a.teAerobic.toFixed(1)) : '')
      if (a.hrZones) setShowZones(true)
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

  /** Legge i dati da uno o più screenshot (Garmin, Strava…) e compila i campi trovati. */
  async function onScreenshots(files: File[]) {
    if (!files.length) return
    setImportMsg(null)
    const t0 = performance.now()
    try {
      const { readScreenshots } = await import('../lib/ocr')
      const s = await readScreenshots(files.slice(0, 6), setOcr)
      const found: string[] = []
      if (s.sport) setSport(s.sport)
      if (s.distanceKm) (setKm(dec(s.distanceKm.toFixed(2).replace(/\.?0+$/, ''))), found.push(t('sport.distance')))
      else if (s.sport === 'spin') setKm('')
      if (s.durationSec) (setTime(fmtDuration(s.durationSec)), found.push(t('sport.time')))
      if (s.elevGain) (setElev(String(s.elevGain)), found.push(t('sport.elev')))
      if (s.avgHr) (setHr(String(s.avgHr)), found.push(t('sport.hr')))
      if (s.kcal) (setKcal(String(s.kcal)), found.push(t('sport.kcal')))
      if (s.avgPower) (setPower(String(s.avgPower)), found.push(t('sport.power')))
      if (s.te) setTe(dec(s.te.toFixed(1)))
      if (s.zones && s.zones.some((z) => z)) {
        setZones(s.zones.map((z) => (z ? fmtDuration(z) : '')))
        setShowZones(true)
        found.push(t('sport.zonesLbl'))
      }
      reset()
      setImportMsg(
        found.length
          ? { ok: true, text: t('ocr.ok', { list: found.map((x) => x.replace(/\s*\(.*\)/, '')).join(', ') }) }
          : { ok: false, text: t('ocr.none') },
      )
      track(MODULE, 'ocr', { n: files.length, found: found.length, ms: Math.round(performance.now() - t0), sport: s.sport })
    } catch (e) {
      setImportMsg({ ok: false, text: t('ocr.error') })
      track(MODULE, 'ocr_error', { msg: String((e as Error)?.message).slice(0, 80) })
    } finally {
      setOcr(null)
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

  // Secondi in zona Z1..Z5 (null se la sezione è vuota)
  const zoneSecs = useMemo(() => {
    const v = zones.map((z) => (z.trim() ? (parseDuration(z) ?? 0) : 0))
    return v.filter((x) => x > 0).length >= 2 ? v : null
  }, [zones])
  const teNum = num(te)

  const base = useMemo(() => {
    if (!img) return null
    const { w, h } = FORMATS[format]
    const c = makeCanvas(w, h)
    const ctx = ctx2d(c)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, w, h)
    drawCover(ctx, img, w, h, framing)
    const out = vid.isVideo ? c : rt.process(c)
    applyFilter(out, filter)
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, format, framing, filter, rt.key, vid.isVideo])

  /** withBase=false: solo grafica su sfondo trasparente (livello da sovrapporre al video) */
  function compose(withBase = true): HTMLCanvasElement | null {
    if (!base) return null
    const { w, h } = FORMATS[format]
    const c = makeCanvas(w, h)
    const ctx = ctx2d(c)
    if (withBase) ctx.drawImage(base, 0, 0)
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

    // Blocco zone cardiache: barre Z5→Z1. Restituisce l'altezza occupata.
    const zonesOn = !!zoneSecs && showZones
    const zoneH = (k: number) => w * (0.045 + 5 * 0.036) * k
    const drawZones = (x: number, y: number, bw: number, k = 1, ink = '#fff') => {
      if (!zoneSecs || !showZones) return
      const maxS = Math.max(...zoneSecs, 1)
      const fs = w * 0.022 * k
      ctx.textAlign = 'left'
      ctx.fillStyle = ink
      ctx.globalAlpha = 0.8
      ctx.font = `600 ${Math.round(fs)}px "Montserrat", sans-serif`
      setSpacing(ctx, fs * 0.12)
      ctx.fillText(t('sport.zonesLbl').toUpperCase(), x, y + fs)
      if (teNum) {
        ctx.textAlign = 'right'
        ctx.fillText(`TE ${dec(teNum.toFixed(1))}`, x + bw, y + fs)
      }
      ctx.globalAlpha = 1
      setSpacing(ctx, 0)
      const rowH = w * 0.036 * k
      const barH = w * 0.016 * k
      const labW = w * 0.06 * k
      const timeW = w * 0.12 * k
      const trackW = bw - labW - timeW
      let yy = y + w * 0.045 * k
      for (let zi = 4; zi >= 0; zi--) {
        const sec = zoneSecs[zi]
        const cy = yy + rowH / 2
        ctx.textAlign = 'left'
        ctx.fillStyle = ZONE_COLORS[zi]
        ctx.font = `800 ${Math.round(fs * 1.05)}px "Inter", sans-serif`
        ctx.fillText(`Z${zi + 1}`, x, cy + fs * 0.38)
        ctx.globalAlpha = 0.18
        ctx.fillStyle = ink
        ctx.beginPath()
        ctx.roundRect(x + labW, cy - barH / 2, trackW, barH, barH / 2)
        ctx.fill()
        ctx.globalAlpha = 1
        if (sec > 0) {
          ctx.fillStyle = ZONE_COLORS[zi]
          ctx.beginPath()
          ctx.roundRect(x + labW, cy - barH / 2, Math.max(barH, (trackW * sec) / maxS), barH, barH / 2)
          ctx.fill()
        }
        ctx.fillStyle = ink
        ctx.textAlign = 'right'
        ctx.font = `700 ${Math.round(fs * 1.05)}px "Inter", sans-serif`
        ctx.fillText(sec > 0 ? fmtDuration(sec) : '–', x + bw, cy + fs * 0.38)
        yy += rowH
      }
      ctx.textAlign = 'left'
    }

    if (layout === 'classic') {
      drawOverlay(ctx, w, h, 'bottom', zonesOn ? 1.35 : 1.1)
      const cols = Math.min(stats.length, stats.length > 3 ? 2 : 3) || 1
      const rows = Math.ceil(stats.length / cols)
      const valPx = w * (cols === 3 ? 0.075 : 0.085)
      const rowH = valPx * 1.75
      const zH = zonesOn ? zoneH(1) + w * 0.02 : 0
      const statsTop = h - m - rows * rowH - zH
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
      drawZones(m, statsTop + rows * rowH + w * 0.01, w - 2 * m)
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
      if (zonesOn) {
        drawZones(m, yy + w * 0.05, w - 2 * m)
        yy += zoneH(1) + w * 0.05
      }
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
      const zTop = zonesOn ? by - zoneH(1) - w * 0.04 : by
      if (zonesOn) {
        ctx.save()
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.beginPath()
        ctx.roundRect(m * 0.6, zTop - w * 0.02, w - m * 1.2, zoneH(1) + w * 0.035, w * 0.02)
        ctx.fill()
        ctx.restore()
        drawZones(m, zTop, w - 2 * m)
      }
      routeIn(m + px * 0.85 + w * 0.12, zTop - w * 0.08)
      badgeBottom = (zonesOn ? zTop - w * 0.02 : by) - w * 0.005
      ctx.fillStyle = accent
      ctx.fillRect(m * 0.6, by, w - m * 1.2, bandH)
      const ink = pickContrast(accent)
      const cw = (w - m * 1.2) / n
      const valPx = w * (n === 4 ? 0.062 : 0.078)
      stats.slice(0, 4).forEach((s, i) => {
        statBlock(m * 0.6 + cw * i + cw * 0.12, by + bandH / 2 + valPx * 0.75, s, valPx, ink)
      })
    } else {
      drawOverlay(ctx, w, h, 'bottom', zonesOn ? 1.15 : 0.8)
      const zk = 0.85
      const zY = h - m - w * 0.27 - (zonesOn ? zoneH(zk) : 0)
      if (zonesOn) drawZones(w * 0.18, zY, w * 0.64, zk)
      routeIn(m * 1.2, zY - w * 0.04)
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
    rt.drawPaintPreview(ctx2d(p))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, layout, accent, title, date, stats, badge, fontsOk, sport, t, route, showRoute, zoneSecs, showZones, te, rt.paintVer, rt.eraseMode])

  async function prepare() {
    const ok = await ensureProfile(MODULE)
    if (!ok) return
    setBusy(true)
    try {
      if (vid.isVideo) {
        const ov = compose(false)
        if (!ov) return
        const { w, h } = FORMATS[format]
        const file = await vid.render({ width: w, height: h, framing, overlay: ov, name: `pizkit-sport-${stamp()}.mp4` })
        setFiles([file])
        track(MODULE, 'export', { video: true, format, layout, sport, len: Math.round(vid.len), mb: Math.round(file.size / 1e5) / 10 })
        return
      }
      const c = compose()
      if (!c) return
      setFiles([await canvasToFile(c, `pizkit-sport-${stamp()}.jpg`)])
      track(MODULE, 'export', { format, layout, sport, filter, km: num(km), time, sec: tt })
    } catch (e) {
      const canceled = /cancel/i.test(String((e as Error)?.name) + String((e as Error)?.message))
      if (!canceled) {
        setError(vid.isVideo ? t('video.error') : t('common.genericError'))
        if (vid.isVideo) track(MODULE, 'video_error', { stage: 'render', msg: String((e as Error)?.message).slice(0, 80) })
      }
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
        <FilePick onFile={onFile} label={t('sport.pick')} sample="sport.jpg" video />
      ) : (
        <div className="workspace">
          <div className={'stage ' + format}>
            <canvas
              ref={preview}
              className={'preview' + (rt.eraseMode ? ' draggable erasing' : '')}
              {...(rt.eraseMode ? { ...rt.handlers, onPointerCancel: rt.handlers.onPointerUp } : {})}
            />
          </div>

          <div className="panel">
            {isSample && (
              <div className="demo-note">
                <span>👀 {t('sport.demoNote')}</span>
                <FilePick onFile={onFile} label={t('sport.useOwn')} compact video />
              </div>
            )}
            <VideoTrim v={vid} onChange={reset} />
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
                accept={IS_IOS ? undefined : '.gpx,.fit,.zip,application/gpx+xml,application/zip'}
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onActivityFile(f)
                  e.target.value = ''
                }}
              />
              <input
                ref={shotInput}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                hidden
                onChange={(e) => {
                  const fs = Array.from(e.target.files ?? [])
                  e.target.value = ''
                  onScreenshots(fs)
                }}
              />
              <div className="row wrap">
                <button type="button" className="btn ghost import-btn" disabled={!!ocr} onClick={() => shotInput.current?.click()}>
                  📷 {t('ocr.btn')}
                </button>
                <button type="button" className="btn ghost import-btn" onClick={() => actInput.current?.click()}>
                  {t('sport.import')}
                </button>
              </div>
              {ocr && (
                <p className="muted small">
                  ⏳ {ocr.phase === 'load' ? t('ocr.loading') : t('ocr.reading', { n: Math.min(ocr.done + 1, ocr.total), tot: ocr.total })}
                </p>
              )}
              {importMsg && <p className={importMsg.ok ? 'ok small' : 'error small'}>{importMsg.text}</p>}
              {!importMsg && !ocr && (
                <p className="muted small">
                  📷 {t('ocr.hint')}
                  <br />
                  {t('sport.importHint')}
                </p>
              )}
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

              <details className="zones-box" open={zones.some((z) => z.trim() !== '')}>
                <summary>❤️ {t('sport.zones')}</summary>
                <div className="zones-grid">
                  {[4, 3, 2, 1, 0].map((zi) => (
                    <label key={zi} style={{ color: ZONE_COLORS[zi] }}>
                      Z{zi + 1}
                      <input
                        inputMode="numeric"
                        value={zones[zi]}
                        placeholder="mm:ss"
                        onChange={(e) => {
                          const v = [...zones]
                          v[zi] = e.target.value
                          setZones(v)
                          reset()
                        }}
                      />
                    </label>
                  ))}
                  <label>
                    TE
                    <input inputMode="decimal" value={te} placeholder="4,2" onChange={(e) => (setTe(e.target.value), reset())} />
                  </label>
                </div>
                <p className="muted small">{t('sport.zonesHint')}</p>
                {zoneSecs && (
                  <label className="toggle">
                    <input type="checkbox" checked={showZones} onChange={(e) => (setShowZones(e.target.checked), reset())} />
                    <span className="toggle-ui" />
                    <span>{t('sport.showZones')}</span>
                  </label>
                )}
              </details>
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

            {!vid.isVideo && <AiTools rt={rt} module={MODULE} onChange={reset} />}

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
              {!vid.isVideo && (
                <Field label={t('common.filter')}>
                  <FilterChips value={filter} onChange={(f) => (setFilter(f), reset(), track(MODULE, 'filter', { f }))} />
                </Field>
              )}
              <label className="toggle">
                <input type="checkbox" checked={badge} onChange={(e) => (setBadge(e.target.checked), reset())} />
                <span className="toggle-ui" />
                <span>{t('common.badge')}</span>
              </label>
            </details>

            <div className="row wrap actions">
              {vid.progress !== null ? (
                <>
                  <button className="btn primary big" disabled>
                    {t('video.creating', { p: Math.round(vid.progress * 100) })}
                  </button>
                  <button className="btn ghost" onClick={vid.cancel}>
                    {t('video.cancel')}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn primary big" onClick={prepare} disabled={busy}>
                    {busy ? t('common.preparing') : vid.isVideo ? t('video.create') : t('sport.create')}
                  </button>
                  <FilePick onFile={onFile} label={t('common.changePhoto')} compact video />
                </>
              )}
            </div>
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}
      {error && !img && <p className="error">{error}</p>}
      {files && <ExportPanel module={MODULE} files={files} zipName="pizkit-sport.zip" onClose={reset} />}
    </section>
  )
}
