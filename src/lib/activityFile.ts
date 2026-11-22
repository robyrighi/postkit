// Lettura di file attività GPX (Garmin Connect, Strava, Komoot…) e FIT (file originale Garmin).
// Tutto avviene nel browser: il file non viene mai inviato a nessuno.

export type SportGuess = 'run' | 'trail' | 'xcski' | 'bike' | 'hike'

export interface ActivityData {
  distanceKm?: number
  durationSec?: number
  elevGain?: number
  avgHr?: number
  date?: Date
  sport?: SportGuess
  name?: string
  points: [number, number][] // [lat, lon]
}

const R = 6371000
function haversine(a: [number, number], b: [number, number]) {
  const toRad = Math.PI / 180
  const dLat = (b[0] - a[0]) * toRad
  const dLon = (b[1] - a[1]) * toRad
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toRad) * Math.cos(b[0] * toRad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Dislivello positivo con smussamento, per non contare il rumore del GPS/barometro. */
export function elevationGain(ele: number[]): number {
  if (ele.length < 2) return 0
  const win = 5
  const smooth = ele.map((_, i) => {
    const a = Math.max(0, i - win)
    const b = Math.min(ele.length, i + win + 1)
    let s = 0
    for (let k = a; k < b; k++) s += ele[k]
    return s / (b - a)
  })
  let gain = 0
  let ref = smooth[0]
  for (const v of smooth) {
    if (v - ref > 1) {
      gain += v - ref
      ref = v
    } else if (v < ref) ref = v
  }
  return gain
}

function guessSport(s: string | undefined | null, sub?: string | null): SportGuess | undefined {
  const t = `${s ?? ''} ${sub ?? ''}`.toLowerCase()
  if (!t.trim()) return undefined
  if (/trail/.test(t)) return 'trail'
  if (/cross_country|nordic|skate_ski|ski/.test(t)) return 'xcski'
  if (/cycl|bik|ride|gravel/.test(t)) return 'bike'
  if (/hik|walk|mountaineer/.test(t)) return 'hike'
  if (/run/.test(t)) return 'run'
  return undefined
}

/** Riduce i punti per disegnare il percorso (non servono 10'000 punti). */
export function simplify(points: [number, number][], max = 1500): [number, number][] {
  if (points.length <= max) return points
  const step = points.length / max
  const out: [number, number][] = []
  for (let i = 0; i < points.length; i += step) out.push(points[Math.floor(i)])
  out.push(points[points.length - 1])
  return out
}

export function parseGpx(text: string): ActivityData {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('GPX non valido')
  const pts = Array.from(doc.getElementsByTagName('trkpt'))
  const nodes = pts.length ? pts : Array.from(doc.getElementsByTagName('rtept'))
  const points: [number, number][] = []
  const ele: number[] = []
  const times: number[] = []
  const hrs: number[] = []
  for (const n of nodes) {
    const lat = parseFloat(n.getAttribute('lat') ?? '')
    const lon = parseFloat(n.getAttribute('lon') ?? '')
    if (!isFinite(lat) || !isFinite(lon)) continue
    points.push([lat, lon])
    const e = n.getElementsByTagName('ele')[0]
    if (e) ele.push(parseFloat(e.textContent ?? ''))
    const tm = n.getElementsByTagName('time')[0]
    if (tm) {
      const v = Date.parse(tm.textContent ?? '')
      if (isFinite(v)) times.push(v)
    }
    // frequenza cardiaca nelle estensioni Garmin (gpxtpx:hr) o simili
    const hrEl = Array.from(n.getElementsByTagName('*')).find((x) => x.localName === 'hr')
    if (hrEl) {
      const v = parseFloat(hrEl.textContent ?? '')
      if (isFinite(v) && v > 30) hrs.push(v)
    }
  }
  if (points.length < 2) throw new Error('Nessun tracciato nel file')
  let dist = 0
  for (let i = 1; i < points.length; i++) dist += haversine(points[i - 1], points[i])
  const type = doc.getElementsByTagName('type')[0]?.textContent
  const name = doc.getElementsByTagName('trk')[0]?.getElementsByTagName('name')[0]?.textContent ?? undefined
  return {
    points,
    distanceKm: dist / 1000,
    durationSec: times.length > 1 ? (times[times.length - 1] - times[0]) / 1000 : undefined,
    elevGain: ele.filter(isFinite).length > 1 ? elevationGain(ele.filter(isFinite)) : undefined,
    avgHr: hrs.length ? hrs.reduce((a, b) => a + b, 0) / hrs.length : undefined,
    date: times.length ? new Date(times[0]) : undefined,
    sport: guessSport(type, name),
    name: name?.trim() || undefined,
  }
}

export async function parseFit(buf: ArrayBuffer): Promise<ActivityData> {
  const { default: FitParser } = await import('fit-file-parser')
  const parser = new FitParser({ force: true, lengthUnit: 'm', speedUnit: 'km/h', mode: 'list' })
  const data = await parser.parseAsync(buf)
  const s = data.sessions?.[0]
  const records = data.records ?? []
  const points: [number, number][] = []
  const ele: number[] = []
  for (const r of records) {
    const lat = r.position_lat as number | undefined
    const lon = r.position_long as number | undefined
    if (typeof lat === 'number' && typeof lon === 'number' && isFinite(lat) && isFinite(lon)) points.push([lat, lon])
    const alt = (r.enhanced_altitude ?? r.altitude) as number | undefined
    if (typeof alt === 'number' && isFinite(alt)) ele.push(alt)
  }
  const dist = s?.total_distance as number | undefined
  const timer = (s?.total_timer_time ?? s?.total_elapsed_time) as number | undefined
  const asc = s?.total_ascent as number | undefined
  const hr = s?.avg_heart_rate as number | undefined
  const start = (s?.start_time ?? records[0]?.timestamp) as Date | string | undefined
  return {
    points,
    distanceKm: typeof dist === 'number' ? dist / 1000 : undefined,
    durationSec: typeof timer === 'number' ? timer : undefined,
    elevGain: typeof asc === 'number' ? asc : ele.length > 1 ? elevationGain(ele) : undefined,
    avgHr: typeof hr === 'number' ? hr : undefined,
    date: start ? new Date(start) : undefined,
    sport: guessSport(s?.sport as string | undefined, s?.sub_sport as string | undefined),
  }
}

export async function readActivityFile(file: File): Promise<ActivityData> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.fit')) return parseFit(await file.arrayBuffer())
  if (name.endsWith('.gpx') || file.type.includes('gpx') || file.type.includes('xml')) return parseGpx(await file.text())
  throw new Error('Formato non supportato')
}

/** Disegna il tracciato dentro un riquadro (proiezione semplice, corretta per la latitudine). */
export function drawRoute(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  box: { x: number; y: number; w: number; h: number },
  color: string,
  width: number,
) {
  const pts = simplify(points)
  if (pts.length < 2) return
  const midLat = pts.reduce((a, p) => a + p[0], 0) / pts.length
  const k = Math.cos((midLat * Math.PI) / 180)
  const xy = pts.map(([lat, lon]) => [lon * k, -lat] as [number, number])
  const xs = xy.map((p) => p[0])
  const ys = xy.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const sw = maxX - minX || 1e-9
  const sh = maxY - minY || 1e-9
  const sc = Math.min(box.w / sw, box.h / sh)
  const ox = box.x + (box.w - sw * sc) / 2
  const oy = box.y + (box.h - sh * sc) / 2
  const P = xy.map(([x, y]) => [ox + (x - minX) * sc, oy + (y - minY) * sc] as [number, number])

  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  // alone scuro per leggibilità su qualsiasi foto
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'
  ctx.lineWidth = width * 2.4
  ctx.beginPath()
  P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
  ctx.shadowColor = color
  ctx.shadowBlur = width * 2
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
  ctx.shadowBlur = 0
  // partenza (bianco) e arrivo (colore)
  const dot = (p: [number, number], fill: string) => {
    ctx.beginPath()
    ctx.arc(p[0], p[1], width * 1.5, 0, Math.PI * 2)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.lineWidth = width * 0.6
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.stroke()
  }
  dot(P[0], '#ffffff')
  dot(P[P.length - 1], color)
  ctx.restore()
}
