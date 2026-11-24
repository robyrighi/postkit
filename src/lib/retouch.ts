// Ritocco "IA" sul dispositivo: migliora automatico, sfondo sfocato/sostituito, gomma magica.
// Nessuna foto lascia il dispositivo: vengono scaricati solo i modelli (una volta, poi restano in cache).
import { cutSubject, makeCanvas } from './image'

export type BgMode = 'none' | 'blur' | 'dark' | 'light' | 'brand'
export const BG_MODES: BgMode[] = ['none', 'blur', 'dark', 'light', 'brand']

/** Migliora automatico: livelli per canale, luminosità media e un filo di saturazione. Modifica il canvas. */
export function autoEnhance(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  const img = ctx.getImageData(0, 0, c.width, c.height)
  const d = img.data
  const n = d.length / 4
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)]
  let lumSum = 0
  const step = n > 2e6 ? 4 : 1 // su foto enormi si campiona
  for (let i = 0; i < d.length; i += 4 * step) {
    hist[0][d[i]]++
    hist[1][d[i + 1]]++
    hist[2][d[i + 2]]++
    lumSum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  }
  const samples = Math.ceil(n / step)
  const pct = (h: Uint32Array, p: number) => {
    const target = samples * p
    let acc = 0
    for (let v = 0; v < 256; v++) {
      acc += h[v]
      if (acc >= target) return v
    }
    return 255
  }
  // gamma per portare la luminosità media verso ~0.47, entro limiti prudenti
  const mean = lumSum / samples / 255
  const gamma = Math.min(1.25, Math.max(0.8, Math.log(0.47) / Math.log(Math.min(0.95, Math.max(0.05, mean)))))
  const luts = hist.map((h) => {
    const lo = Math.min(pct(h, 0.005), 60)
    const hi = Math.max(pct(h, 0.995), 195)
    const lut = new Uint8ClampedArray(256)
    for (let v = 0; v < 256; v++) {
      const x = Math.min(1, Math.max(0, (v - lo) / (hi - lo)))
      lut[v] = Math.round(255 * Math.pow(x, 1 / gamma))
    }
    return lut
  })
  const sat = 1.12
  for (let i = 0; i < d.length; i += 4) {
    let r = luts[0][d[i]]
    let g = luts[1][d[i + 1]]
    let b = luts[2][d[i + 2]]
    const l = 0.299 * r + 0.587 * g + 0.114 * b
    r = l + (r - l) * sat
    g = l + (g - l) * sat
    b = l + (b - l) * sat
    d[i] = r
    d[i + 1] = g
    d[i + 2] = b
  }
  ctx.putImageData(img, 0, 0)
}

/** Sfocatura forte e compatibile con tutti i browser (riduzione + ingrandimento progressivi). */
export function blurCanvas(src: HTMLCanvasElement, strength = 24): HTMLCanvasElement {
  const w = src.width
  const h = src.height
  let cur: HTMLCanvasElement = src
  const steps: number[] = []
  for (let k = 2; k <= strength; k *= 2) steps.push(k)
  for (const k of steps) {
    const c = makeCanvas(Math.max(1, Math.round(w / k)), Math.max(1, Math.round(h / k)))
    const x = c.getContext('2d')!
    x.imageSmoothingEnabled = true
    x.imageSmoothingQuality = 'high'
    x.drawImage(cur, 0, 0, c.width, c.height)
    cur = c
  }
  for (let i = steps.length - 2; i >= -1; i--) {
    const k = i >= 0 ? steps[i] : 1
    const c = makeCanvas(Math.max(1, Math.round(w / k)), Math.max(1, Math.round(h / k)))
    const x = c.getContext('2d')!
    x.imageSmoothingEnabled = true
    x.imageSmoothingQuality = 'high'
    x.drawImage(cur, 0, 0, c.width, c.height)
    cur = c
  }
  return cur
}

/** Sfondo sfocato o sostituito; la persona resta nitida sopra. */
export function applyBackground(framed: HTMLCanvasElement, mask: HTMLCanvasElement, mode: BgMode): HTMLCanvasElement {
  const w = framed.width
  const h = framed.height
  const out = makeCanvas(w, h)
  const ctx = out.getContext('2d')!
  if (mode === 'blur') {
    ctx.drawImage(blurCanvas(framed, Math.max(16, Math.round(w / 40))), 0, 0, w, h)
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    ctx.fillRect(0, 0, w, h)
  } else {
    const g = ctx.createLinearGradient(0, 0, w * 0.4, h)
    if (mode === 'dark') {
      g.addColorStop(0, '#1d1530')
      g.addColorStop(1, '#09070f')
    } else if (mode === 'light') {
      g.addColorStop(0, '#ffffff')
      g.addColorStop(1, '#e9e5f1')
    } else {
      g.addColorStop(0, '#ff5a8a')
      g.addColorStop(0.55, '#ff7a2f')
      g.addColorStop(1, '#ffb347')
    }
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
  ctx.drawImage(cutSubject(framed, mask), 0, 0)
  return out
}

// ---------------------------------------------------------------- Gomma magica (MI-GAN, licenza MIT)

const MODEL_URL = `${import.meta.env.BASE_URL}models/migan-512.onnx`
type Ort = typeof import('onnxruntime-web/wasm')
let sessionPromise: Promise<{ ort: Ort; session: import('onnxruntime-web/wasm').InferenceSession }> | null = null

/** Scarica (una volta) il modello; onProgress riceve 0..1 durante il download. */
export function loadEraser(onProgress?: (p: number) => void) {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import('onnxruntime-web/wasm')
      ort.env.wasm.wasmPaths = `${import.meta.env.BASE_URL}ort/`
      ort.env.wasm.numThreads = 1
      const res = await fetch(MODEL_URL)
      if (!res.ok || !res.body) throw new Error('Modello non disponibile')
      const total = Number(res.headers.get('content-length')) || 26.6e6
      const reader = res.body.getReader()
      const chunks: Uint8Array[] = []
      let got = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        got += value.length
        onProgress?.(Math.min(0.99, got / total))
      }
      const buf = new Uint8Array(got)
      let off = 0
      for (const c of chunks) {
        buf.set(c, off)
        off += c.length
      }
      const session = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' })
      onProgress?.(1)
      return { ort, session }
    })()
    sessionPromise.catch(() => {
      sessionPromise = null
    })
  }
  return sessionPromise
}

/**
 * Cancella le zone dipinte (alfa > 0 in `paint`) dall'immagine e le ricostruisce.
 * Lavora su un ritaglio quadrato attorno alla zona, ridotto a 512×512 come il modello.
 */
export async function eraseRegion(image: HTMLCanvasElement, paint: HTMLCanvasElement, onProgress?: (p: number) => void) {
  const { ort, session } = await loadEraser(onProgress)
  onProgress?.(1)
  const W = image.width
  const H = image.height
  // riquadro della zona dipinta
  const pm = paint.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, W, H).data
  let x0 = W
  let y0 = H
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (pm[(y * W + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return image
  // quadrato con margine (il modello ha bisogno di contesto attorno)
  const side0 = Math.max(x1 - x0, y1 - y0)
  const side = Math.min(Math.max(W, H), Math.max(256, Math.round(side0 * 1.6 + 128)))
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const sx = Math.round(Math.min(Math.max(0, cx - side / 2), Math.max(0, W - side)))
  const sy = Math.round(Math.min(Math.max(0, cy - side / 2), Math.max(0, H - side)))
  const sw = Math.min(side, W)
  const sh = Math.min(side, H)

  const S = 512
  const ci = makeCanvas(S, S)
  const cictx = ci.getContext('2d', { willReadFrequently: true })!
  cictx.imageSmoothingQuality = 'high'
  cictx.drawImage(image, sx, sy, sw, sh, 0, 0, S, S)
  const cm = makeCanvas(S, S)
  const cmctx = cm.getContext('2d', { willReadFrequently: true })!
  cmctx.drawImage(paint, sx, sy, sw, sh, 0, 0, S, S)
  const px = cictx.getImageData(0, 0, S, S).data
  const mk = cmctx.getImageData(0, 0, S, S).data

  // ingresso: [0.5 - maschera, immagine*(1-maschera)] con immagine in [-1, 1]
  const N = S * S
  const input = new Float32Array(4 * N)
  for (let i = 0; i < N; i++) {
    const m = mk[i * 4 + 3] > 20 ? 1 : 0
    input[i] = 0.5 - m
    const keep = 1 - m
    input[N + i] = (px[i * 4] / 127.5 - 1) * keep
    input[2 * N + i] = (px[i * 4 + 1] / 127.5 - 1) * keep
    input[3 * N + i] = (px[i * 4 + 2] / 127.5 - 1) * keep
  }
  const out = await session.run({ input: new ort.Tensor('float32', input, [1, 4, S, S]) })
  const o = (out.output ?? Object.values(out)[0]).data as Float32Array

  const res = cictx.createImageData(S, S)
  for (let i = 0; i < N; i++) {
    res.data[i * 4] = o[i] * 127.5 + 127.5
    res.data[i * 4 + 1] = o[N + i] * 127.5 + 127.5
    res.data[i * 4 + 2] = o[2 * N + i] * 127.5 + 127.5
    res.data[i * 4 + 3] = 255
  }
  const filled = makeCanvas(S, S)
  filled.getContext('2d')!.putImageData(res, 0, 0)

  // incolla solo le zone dipinte (bordo leggermente sfumato)
  const patch = makeCanvas(sw, sh)
  const pctx = patch.getContext('2d')!
  pctx.imageSmoothingQuality = 'high'
  pctx.drawImage(filled, 0, 0, sw, sh)
  const soft = makeCanvas(sw, sh)
  const sctx = soft.getContext('2d')!
  sctx.filter = 'blur(2px)'
  sctx.drawImage(paint, sx, sy, sw, sh, 0, 0, sw, sh)
  sctx.filter = 'none'
  pctx.globalCompositeOperation = 'destination-in'
  pctx.drawImage(soft, 0, 0)

  const result = makeCanvas(W, H)
  const rctx = result.getContext('2d')!
  rctx.drawImage(image, 0, 0)
  rctx.drawImage(patch, sx, sy)
  return result
}
