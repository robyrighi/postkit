export type Source = ImageBitmap | HTMLImageElement | HTMLCanvasElement

export function srcSize(s: Source): { w: number; h: number } {
  if (s instanceof HTMLImageElement) return { w: s.naturalWidth, h: s.naturalHeight }
  return { w: s.width, h: s.height }
}

/** Carica un file immagine rispettando l'orientamento EXIF. */
export async function loadImage(file: File): Promise<Source> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* fallback sotto (es. HEIC su browser che non lo decodificano) */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export interface Framing {
  zoom: number // 1 = riempie esattamente l'area (cover)
  x: number // -1..1 spostamento orizzontale
  y: number // -1..1 spostamento verticale
}

export const defaultFraming: Framing = { zoom: 1, x: 0, y: 0 }

/** Disegna l'immagine in modalità "cover" con zoom e spostamento. */
export function drawCover(ctx: CanvasRenderingContext2D, src: Source, w: number, h: number, f: Framing) {
  const s = srcSize(src)
  const scale = Math.max(w / s.w, h / s.h) * Math.max(1, f.zoom)
  const dw = s.w * scale
  const dh = s.h * scale
  const maxX = (dw - w) / 2
  const maxY = (dh - h) / 2
  const dx = (w - dw) / 2 + f.x * maxX
  const dy = (h - dh) / 2 + f.y * maxY
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, dx, dy, dw, dh)
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d', { willReadFrequently: false })
  if (!ctx) throw new Error('Canvas 2D non disponibile')
  return ctx
}

// ---------- Filtri (pixel per pixel: funzionano anche dove ctx.filter non c'è) ----------

export type FilterKey = 'none' | 'bw' | 'bwContrast' | 'vivid' | 'warm' | 'cool' | 'faded' | 'film'

export const FILTERS: FilterKey[] = ['none', 'vivid', 'bw', 'bwContrast', 'warm', 'cool', 'faded', 'film']

interface Adjust {
  sat: number // 1 = invariato, 0 = B/N
  contrast: number // 1 = invariato
  bright: number // offset -255..255
  r: number
  g: number
  b: number // moltiplicatori
  lift: number // solleva i neri (effetto matte)
}

const PRESETS: Record<FilterKey, Adjust | null> = {
  none: null,
  vivid: { sat: 1.3, contrast: 1.08, bright: 0, r: 1, g: 1, b: 1, lift: 0 },
  bw: { sat: 0, contrast: 1.05, bright: 0, r: 1, g: 1, b: 1, lift: 0 },
  bwContrast: { sat: 0, contrast: 1.35, bright: -6, r: 1, g: 1, b: 1, lift: 0 },
  warm: { sat: 1.1, contrast: 1.04, bright: 4, r: 1.07, g: 1.01, b: 0.9, lift: 0 },
  cool: { sat: 1.0, contrast: 1.04, bright: 0, r: 0.92, g: 1.0, b: 1.08, lift: 0 },
  faded: { sat: 0.8, contrast: 0.9, bright: 6, r: 1, g: 1, b: 1, lift: 28 },
  film: { sat: 0.9, contrast: 1.1, bright: 0, r: 1.05, g: 1.0, b: 0.92, lift: 16 },
}

export function applyFilter(canvas: HTMLCanvasElement, key: FilterKey) {
  const a = PRESETS[key]
  if (!a) return
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  const lut = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) {
    let v = (i - 128) * a.contrast + 128 + a.bright
    v = a.lift + v * (1 - a.lift / 255)
    lut[i] = v
  }
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * a.r
    let g = d[i + 1] * a.g
    let b = d[i + 2] * a.b
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
    r = l + (r - l) * a.sat
    g = l + (g - l) * a.sat
    b = l + (b - l) * a.sat
    d[i] = lut[Math.max(0, Math.min(255, r | 0))]
    d[i + 1] = lut[Math.max(0, Math.min(255, g | 0))]
    d[i + 2] = lut[Math.max(0, Math.min(255, b | 0))]
  }
  ctx.putImageData(img, 0, 0)
}

/** Attende che il font sia pronto prima di disegnare su canvas. */
export async function ensureFont(family: string, weight = 400) {
  try {
    await document.fonts.load(`${weight} 64px "${family}"`)
  } catch {
    /* ignora */
  }
}

/** Testo a capo automatico entro una larghezza massima. */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    if (!words.length) {
      out.push('')
      continue
    }
    let line = words[0]
    for (let i = 1; i < words.length; i++) {
      const test = line + ' ' + words[i]
      if (ctx.measureText(test).width <= maxWidth) line = test
      else {
        out.push(line)
        line = words[i]
      }
    }
    out.push(line)
  }
  return out
}

/** letterSpacing su canvas dove supportato (Chrome/Safari recenti). */
export function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
  if ('letterSpacing' in c) c.letterSpacing = `${px}px`
}

/** Ritaglia il soggetto da `source` usando la maschera. */
export function cutSubject(source: HTMLCanvasElement, mask: HTMLCanvasElement): HTMLCanvasElement {
  const c = makeCanvas(source.width, source.height)
  const ctx = c.getContext('2d')!
  ctx.drawImage(source, 0, 0)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(mask, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  return c
}
