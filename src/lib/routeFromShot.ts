// Estrae il tracciato (solo la linea) da uno screenshot di una mappa (Garmin Connect, Strava, …).
// Tutto sul dispositivo. L'utente tocca la linea: da lì prendiamo i pixel "colorati" collegati,
// togliamo i simboli grossi (puntine, medaglie, cartelli), uniamo i pezzi interrotti dai numeri dei km
// e restituiamo la linea come insieme di tratti (coordinate in pixel dello screenshot).

export interface Rgba {
  data: Uint8ClampedArray | Uint8Array
  width: number
  height: number
}
export type Pt = [number, number]
export interface ShotRoute {
  segments: Pt[][] // in pixel dell'immagine originale
  mask: Uint8Array // maschera finale (immagine di lavoro), per l'anteprima
  workW: number
  workH: number
  scale: number // fattore immagine di lavoro → originale
}

const MAX_W = 720

/** Pixel "da tracciato": colore saturo, non grigio, non bianco, non troppo scuro. */
function routeLike(r: number, g: number, b: number): boolean {
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const d = mx - mn
  return mx >= 80 && d >= 90 && d / mx >= 0.5
}

/** Riduce l'immagine (media dei pixel) a una larghezza di lavoro, restituendo la maschera. */
function hueOf(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn || 1
  let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  hh *= 60
  return hh < 0 ? hh + 360 : hh
}

type Pred = (r: number, g: number, b: number) => boolean

function buildMask(img: Rgba, pred: Pred = routeLike): { m: Uint8Array; w: number; h: number; s: number } {
  const s = Math.max(1, img.width / MAX_W)
  const w = Math.round(img.width / s)
  const h = Math.round(img.height / s)
  const m = new Uint8Array(w * h)
  const src = img.data
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * s)
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * s))
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * s)
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * s))
      let hit = 0
      let n = 0
      for (let yy = y0; yy < y1 && yy < img.height; yy++) {
        for (let xx = x0; xx < x1 && xx < img.width; xx++) {
          const i = (yy * img.width + xx) * 4
          if (pred(src[i], src[i + 1], src[i + 2])) hit++
          n++
        }
      }
      m[y * w + x] = hit * 2 >= n ? 1 : 0
    }
  }
  return { m, w, h, s }
}

/** Distanza (chamfer 3-4, divisa per 3) dal bordo della maschera. */
function distance(m: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e9
  const d = new Float32Array(w * h)
  for (let i = 0; i < d.length; i++) d[i] = m[i] ? INF : 0
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!d[i]) continue
      let v = d[i]
      if (x > 0) v = Math.min(v, d[i - 1] + 3)
      if (y > 0) {
        v = Math.min(v, d[i - w] + 3)
        if (x > 0) v = Math.min(v, d[i - w - 1] + 4)
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4)
      }
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) v = Math.min(v, 3)
      d[i] = v
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      if (!d[i]) continue
      let v = d[i]
      if (x < w - 1) v = Math.min(v, d[i + 1] + 3)
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + 3)
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4)
        if (x > 0) v = Math.min(v, d[i + w - 1] + 4)
      }
      d[i] = v
    }
  for (let i = 0; i < d.length; i++) d[i] /= 3
  return d
}

/** Etichetta le componenti connesse (8 vicini). */
function label(m: Uint8Array, w: number, h: number): { lab: Int32Array; n: number; size: number[]; box: number[][] } {
  const lab = new Int32Array(w * h).fill(-1)
  const size: number[] = []
  const box: number[][] = []
  const stack: number[] = []
  let n = 0
  for (let i = 0; i < m.length; i++) {
    if (!m[i] || lab[i] >= 0) continue
    let cnt = 0
    let x0 = w,
      y0 = h,
      x1 = 0,
      y1 = 0
    lab[i] = n
    stack.push(i)
    while (stack.length) {
      const p = stack.pop()!
      cnt++
      const x = p % w
      const y = (p - x) / w
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          const q = yy * w + xx
          if (m[q] && lab[q] < 0) {
            lab[q] = n
            stack.push(q)
          }
        }
      }
    }
    size.push(cnt)
    box.push([x0, y0, x1, y1])
    n++
  }
  return { lab, n, size, box }
}

function nearestOn(m: Uint8Array, w: number, h: number, x: number, y: number, r: number): number {
  let best = -1
  let bd = Infinity
  for (let yy = Math.max(0, y - r); yy <= Math.min(h - 1, y + r); yy++)
    for (let xx = Math.max(0, x - r); xx <= Math.min(w - 1, x + r); xx++) {
      const q = yy * w + xx
      if (!m[q]) continue
      const dd = (xx - x) ** 2 + (yy - y) ** 2
      if (dd < bd) {
        bd = dd
        best = q
      }
    }
  return best
}

/** Assottigliamento Zhang-Suen: restituisce lo "scheletro" largo 1 pixel. */
function thin(m: Uint8Array, w: number, h: number): Uint8Array {
  const a = m.slice()
  const del: number[] = []
  let changed = true
  const P = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : a[y * w + x])
  while (changed) {
    changed = false
    for (let step = 0; step < 2; step++) {
      del.length = 0
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (!a[y * w + x]) continue
          const p2 = P(x, y - 1),
            p3 = P(x + 1, y - 1),
            p4 = P(x + 1, y),
            p5 = P(x + 1, y + 1),
            p6 = P(x, y + 1),
            p7 = P(x - 1, y + 1),
            p8 = P(x - 1, y),
            p9 = P(x - 1, y - 1)
          const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
          if (B < 2 || B > 6) continue
          const seq = [p2, p3, p4, p5, p6, p7, p8, p9, p2]
          let A = 0
          for (let k = 0; k < 8; k++) if (!seq[k] && seq[k + 1]) A++
          if (A !== 1) continue
          if (step === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue
          del.push(y * w + x)
        }
      if (del.length) changed = true
      for (const q of del) a[q] = 0
    }
  }
  return a
}

const N8: Pt[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
]

/** Vicini in m-adiacenza: le diagonali contano solo se non c'è già un passaggio a 4 vicini (niente "scalini" doppi). */
function nbrs(sk: Uint8Array, w: number, h: number, p: number): number[] {
  const x = p % w,
    y = (p - x) / w
  const on = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < w && yy < h && sk[yy * w + xx] === 1
  const out: number[] = []
  const n = on(x, y - 1),
    s = on(x, y + 1),
    e = on(x + 1, y),
    o = on(x - 1, y)
  if (n) out.push(p - w)
  if (s) out.push(p + w)
  if (e) out.push(p + 1)
  if (o) out.push(p - 1)
  if (on(x + 1, y - 1) && !n && !e) out.push(p - w + 1)
  if (on(x - 1, y - 1) && !n && !o) out.push(p - w - 1)
  if (on(x + 1, y + 1) && !s && !e) out.push(p + w + 1)
  if (on(x - 1, y + 1) && !s && !o) out.push(p + w - 1)
  return out
}

/** Trasforma lo scheletro in tratti (polilinee) tra estremi e incroci. */
function trace(sk: Uint8Array, w: number, h: number): { segs: Pt[][]; deg: Uint8Array } {
  const deg = new Uint8Array(w * h)
  for (let i = 0; i < sk.length; i++) if (sk[i]) deg[i] = nbrs(sk, w, h, i).length
  const usedEdge = new Set<string>()
  const key = (a: number, b: number) => (a < b ? a + ',' + b : b + ',' + a)
  const segs: Pt[][] = []
  const P = (q: number): Pt => [q % w, Math.floor(q / w)]
  const walk = (start: number, next: number) => {
    const path: Pt[] = [P(start)]
    let prev = start
    let cur = next
    usedEdge.add(key(prev, cur))
    for (;;) {
      path.push(P(cur))
      if (deg[cur] !== 2) break
      const nx = nbrs(sk, w, h, cur).find((q) => q !== prev && !usedEdge.has(key(cur, q)))
      if (nx === undefined) break
      usedEdge.add(key(cur, nx))
      prev = cur
      cur = nx
    }
    segs.push(path)
  }
  const fromNodes = (pred: (d: number) => boolean) => {
    for (let i = 0; i < sk.length; i++) {
      if (!sk[i] || !pred(deg[i])) continue
      for (const q of nbrs(sk, w, h, i)) if (!usedEdge.has(key(i, q))) walk(i, q)
    }
  }
  fromNodes((d) => d !== 2) // estremi e incroci
  fromNodes(() => true) // anelli chiusi rimasti
  return { segs, deg }
}

function segLen(s: Pt[]): number {
  let l = 0
  for (let i = 1; i < s.length; i++) l += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1])
  return l
}

/** Douglas-Peucker */
function rdp(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts
  let idx = -1,
    dm = 0
  const [ax, ay] = pts[0]
  const [bx, by] = pts[pts.length - 1]
  const L = Math.hypot(bx - ax, by - ay)
  for (let i = 1; i < pts.length - 1; i++) {
    // tratto chiuso (inizio = fine): distanza dal punto iniziale
    const d =
      L < 1e-6
        ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay)
        : Math.abs((by - ay) * pts[i][0] - (bx - ax) * pts[i][1] + bx * ay - by * ax) / L
    if (d > dm) {
      dm = d
      idx = i
    }
  }
  if (dm <= eps) return [pts[0], pts[pts.length - 1]]
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)]
}

/** Chaikin: smussa gli angoli dei pixel. */
function chaikin(pts: Pt[], it = 2): Pt[] {
  let p = pts
  for (let k = 0; k < it; k++) {
    if (p.length < 3) return p
    const q: Pt[] = [p[0]]
    for (let i = 0; i < p.length - 1; i++) {
      const [x0, y0] = p[i],
        [x1, y1] = p[i + 1]
      q.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25], [x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75])
    }
    q.push(p[p.length - 1])
    p = q
  }
  return p
}

/**
 * Estrae il tracciato. `taps` = punti toccati dall'utente (in pixel dell'immagine originale).
 * Restituisce null se nel punto toccato non c'è una linea colorata.
 */
export function extractRoute(img: Rgba, taps: Pt[]): ShotRoute | null {
  const first = extractWith(img, taps, routeLike)
  if (!first) return null
  // Linea di un colore solo (es. Strava arancione)? Allora rifacciamo tenendo solo quel colore:
  // così spariscono medaglie e simboli di tinta simile ma più scuri.
  const { mask, workW: w, scale: s } = first
  const hues: number[] = []
  const vals: number[] = []
  for (let i = 0; i < mask.length; i += 2) {
    if (!mask[i]) continue
    const xx = Math.min(img.width - 1, Math.round(((i % w) + 0.5) * s)),
      yy = Math.min(img.height - 1, Math.round((Math.floor(i / w) + 0.5) * s))
    const j = (yy * img.width + xx) * 4
    const r = img.data[j],
      g = img.data[j + 1],
      b = img.data[j + 2]
    if (!routeLike(r, g, b)) continue
    hues.push(hueOf(r, g, b))
    vals.push(Math.max(r, g, b))
  }
  if (hues.length < 30) return first
  const h0 = circMedian(hues)
  const near = hues.filter((x) => Math.min(Math.abs(x - h0), 360 - Math.abs(x - h0)) <= 15).length
  if (near / hues.length < 0.9) return first // più colori (es. Garmin, colorato per ritmo)
  vals.sort((x, y) => x - y)
  const v0 = vals[Math.floor(vals.length * 0.6)]
  const pred: Pred = (r, g, b) => {
    if (!routeLike(r, g, b)) return false
    const dh = Math.abs(hueOf(r, g, b) - h0)
    return Math.min(dh, 360 - dh) <= 15 && Math.max(r, g, b) >= v0 * 0.82
  }
  return extractWith(img, taps, pred) ?? first
}

function circMedian(hs: number[]): number {
  // tinta prevalente: istogramma a passi di 5°
  const bins = new Array(72).fill(0)
  for (const x of hs) bins[Math.floor(x / 5) % 72]++
  let bi = 0
  for (let i = 1; i < 72; i++) if (bins[i] > bins[bi]) bi = i
  return bi * 5 + 2.5
}

function extractWith(img: Rgba, taps: Pt[], pred: Pred): ShotRoute | null {
  const { m: raw, w, h, s } = buildMask(img, pred)
  const seeds = taps.map(([x, y]) => nearestOn(raw, w, h, Math.round(x / s), Math.round(y / s), Math.round(w * 0.03)))
  if (seeds.every((q) => q < 0)) return null

  // 1. Spessore tipico della linea, misurato vicino al tocco
  const dist0 = distance(raw, w, h)
  const ridge: number[] = []
  for (const sd of seeds) {
    if (sd < 0) continue
    const sx = sd % w,
      sy = Math.floor(sd / w)
    for (let yy = Math.max(1, sy - 25); yy < Math.min(h - 1, sy + 25); yy++)
      for (let xx = Math.max(1, sx - 25); xx < Math.min(w - 1, sx + 25); xx++) {
        const q = yy * w + xx
        const v = dist0[q]
        if (v > 0 && v >= dist0[q - 1] && v >= dist0[q + 1] && v >= dist0[q - w] && v >= dist0[q + w]) ridge.push(v)
      }
  }
  ridge.sort((a, b) => a - b)
  const half = Math.max(1.5, ridge.length ? ridge[Math.floor(ridge.length / 2)] : 2)

  // 2. Togliamo i "blob" (puntine, medaglie, cartelli): zone molto più spesse della linea
  const m = raw.slice()
  const core = Math.max(half * 2.2 + 1, w * 0.014)
  for (let i = 0; i < m.length; i++) {
    const r = dist0[i]
    if (r < core) continue
    const x = i % w,
      y = Math.floor(i / w)
    const R = Math.ceil(r + 1.5)
    for (let yy = Math.max(0, y - R); yy <= Math.min(h - 1, y + R); yy++)
      for (let xx = Math.max(0, x - R); xx <= Math.min(w - 1, x + R); xx++)
        if ((xx - x) ** 2 + (yy - y) ** 2 <= R * R) m[yy * w + xx] = 0
  }

  // 3. Componenti: partiamo da quelle toccate e aggiungiamo i pezzi vicini a forma di linea
  const { lab, n, size, box } = label(m, w, h)
  const lineLike = (c: number) => {
    const [x0, y0, x1, y1] = box[c]
    const bw = x1 - x0 + 1,
      bh = y1 - y0 + 1
    const fill = size[c] / (bw * bh)
    const length = size[c] / (2 * half)
    const rectangle = fill > 0.75 && Math.min(bw, bh) > half * 1.5
    return !rectangle && length >= w * 0.045
  }
  const sel = new Uint8Array(n)
  for (const sd of seeds) {
    if (sd < 0) continue
    const sx = sd % w,
      sy = Math.floor(sd / w)
    const q = nearestOn(m, w, h, sx, sy, Math.round(half * 4 + 4))
    if (q >= 0) sel[lab[q]] = 1
  }
  if (!sel.some((v) => v)) return null
  const gap = Math.round(w * 0.06)
  for (let iter = 0; iter < 30; iter++) {
    // distanza BFS dai pixel selezionati, fino a "gap"
    const dd = new Int16Array(w * h).fill(-1)
    let queue: number[] = []
    for (let i = 0; i < m.length; i++)
      if (m[i] && sel[lab[i]]) {
        dd[i] = 0
        queue.push(i)
      }
    const reached = new Set<number>()
    for (let d = 0; d < gap && queue.length; d++) {
      const nq: number[] = []
      for (const p of queue) {
        const x = p % w,
          y = (p - x) / w
        for (const [dx, dy] of N8) {
          const xx = x + dx,
            yy = y + dy
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
          const q = yy * w + xx
          if (dd[q] >= 0) continue
          dd[q] = d + 1
          if (m[q]) {
            const c = lab[q]
            if (!sel[c]) reached.add(c)
          } else nq.push(q)
        }
      }
      queue = nq
    }
    let added = false
    for (const c of reached)
      if (lineLike(c)) {
        sel[c] = 1
        added = true
      }
    if (!added) break
  }
  const fm = new Uint8Array(w * h)
  for (let i = 0; i < m.length; i++) if (m[i] && sel[lab[i]]) fm[i] = 1

  // 4. Scheletro → tratti, potando i rametti corti che partono da un incrocio
  const sk = thin(fm, w, h)
  const tr = trace(sk, w, h)
  const at = (p: Pt) => tr.deg[p[1] * w + p[0]]
  const spur = half * 3 + 3
  let segs = tr.segs.filter((sg) => {
    if (sg.length < 2) return false
    const a = at(sg[0]),
      b = at(sg[sg.length - 1])
    const isSpur = (a === 1 && b >= 3) || (b === 1 && a >= 3)
    return !(isSpur && segLen(sg) < spur)
  })
  const k = (p: Pt) => p[0] + ',' + p[1]

  // 5. Uniamo gli estremi liberi vicini (pezzi interrotti dai numeri dei km o dalle frecce)
  const ends: { p: Pt; seg: number }[] = []
  const cnt = new Map<string, number>()
  for (const sg of segs) for (const p of [sg[0], sg[sg.length - 1]]) cnt.set(k(p), (cnt.get(k(p)) ?? 0) + 1)
  segs.forEach((sg, i) => {
    for (const p of [sg[0], sg[sg.length - 1]]) if (cnt.get(k(p)) === 1) ends.push({ p, seg: i })
  })
  const pairs: [number, number, number][] = []
  for (let a = 0; a < ends.length; a++)
    for (let b = a + 1; b < ends.length; b++) {
      if (ends[a].seg === ends[b].seg && segLen(segs[ends[a].seg]) < gap * 2) continue
      const d = Math.hypot(ends[a].p[0] - ends[b].p[0], ends[a].p[1] - ends[b].p[1])
      if (d <= gap * 1.1) pairs.push([d, a, b])
    }
  pairs.sort((x, y) => x[0] - y[0])
  const used = new Set<number>()
  for (const [, a, b] of pairs) {
    if (used.has(a) || used.has(b)) continue
    used.add(a)
    used.add(b)
    segs.push([ends[a].p, ends[b].p])
  }

  // Anelli piccoli chiusi = contorni di cartelli o icone (es. il "13" della strada): via
  segs = segs.filter((sg) => {
    const a = sg[0],
      b = sg[sg.length - 1]
    const closed = Math.hypot(a[0] - b[0], a[1] - b[1]) <= 2
    return !(closed && segLen(sg) < w * 0.16)
  })

  // 6. Semplifica, smussa e riporta alla scala dell'immagine originale
  const out = segs
    .map((sg) => chaikin(rdp(sg, 0.9), 2).map(([x, y]) => [(x + 0.5) * s, (y + 0.5) * s] as Pt))
    .filter((sg) => sg.length > 1)
  if (!out.length) return null
  return { segments: out, mask: fm, workW: w, workH: h, scale: s }
}
