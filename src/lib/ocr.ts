// Lettura dei dati dagli screenshot di Garmin/Strava, tutto sul dispositivo (Tesseract.js, licenza Apache 2.0).
import { loadImage, makeCanvas } from './image'
import { mergeStats, parseStats, type ParsedStats } from './statsParse'

const BASE = `${import.meta.env.BASE_URL}ocr/`
type Worker = import('tesseract.js').Worker
let workerP: Promise<Worker> | null = null

function getWorker(onLoad?: (p: number) => void) {
  if (!workerP) {
    workerP = (async () => {
      const T = await import('tesseract.js')
      return T.createWorker('eng', 1, {
        workerPath: `${BASE}worker.min.js`,
        corePath: BASE,
        langPath: `${BASE}lang`,
        workerBlobURL: false,
        gzip: true,
        logger: (m: { status: string; progress: number }) => {
          if (/loading|initializ/.test(m.status)) onLoad?.(m.progress)
        },
      })
    })()
    workerP.catch(() => (workerP = null))
  }
  return workerP
}

/** Due versioni dell'immagine: scala di grigi normale e bianco/nero (soglia di Otsu), testo scuro su chiaro. */
async function variants(file: File): Promise<HTMLCanvasElement[]> {
  const img = await loadImage(file)
  const w0 = 'width' in img ? img.width : 0
  const h0 = 'height' in img ? img.height : 0
  const k = w0 < 900 ? 2 : w0 > 2000 ? 2000 / w0 : 1
  const w = Math.round(w0 * k)
  const h = Math.round(h0 * k)
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img as CanvasImageSource, 0, 0, w, h)
  const id = ctx.getImageData(0, 0, w, h)
  const d = id.data
  const gray = new Uint8Array(w * h)
  let sum = 0
  for (let i = 0; i < gray.length; i++) {
    const v = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2])
    gray[i] = v
    sum += v
  }
  const dark = sum / gray.length < 128
  if (dark) for (let i = 0; i < gray.length; i++) gray[i] = 255 - gray[i]
  // soglia di Otsu
  const hist = new Float64Array(256)
  for (const v of gray) hist[v]++
  let wB = 0
  let sumB = 0
  let sumAll = 0
  for (let v = 0; v < 256; v++) sumAll += v * hist[v]
  let best = 0
  let thr = 128
  for (let v = 0; v < 256; v++) {
    wB += hist[v]
    if (!wB) continue
    const wF = gray.length - wB
    if (!wF) break
    sumB += v * hist[v]
    const mB = sumB / wB
    const mF = (sumAll - sumB) / wF
    const between = wB * wF * (mB - mF) ** 2
    if (between > best) {
      best = between
      thr = v
    }
  }
  const mk = (f: (v: number) => number) => {
    const out = makeCanvas(w, h)
    const o = out.getContext('2d')!
    const im = o.createImageData(w, h)
    for (let i = 0; i < gray.length; i++) {
      const v = f(gray[i])
      im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v
      im.data[i * 4 + 3] = 255
    }
    o.putImageData(im, 0, 0)
    return out
  }
  return [mk((v) => (v > thr ? 255 : 0)), mk((v) => v)]
}

export interface OcrProgress {
  phase: 'load' | 'read'
  done: number
  total: number
}

export async function readScreenshots(files: File[], onProgress?: (p: OcrProgress) => void): Promise<ParsedStats> {
  onProgress?.({ phase: 'load', done: 0, total: files.length })
  const worker = await getWorker()
  const results: ParsedStats[] = []
  let n = 0
  for (const f of files) {
    onProgress?.({ phase: 'read', done: n, total: files.length })
    const [bin, plain] = await variants(f)
    const first = parseStats((await worker.recognize(bin)).data.text)
    results.push(first)
    // seconda lettura (scala di grigi) solo se la prima ha trovato poco o zone incomplete
    const fields = Object.keys(first).filter((k) => k !== 'sport').length
    if (fields < 2 || (first.zones && first.zones.some((z) => z === undefined))) {
      results.push(parseStats((await worker.recognize(plain)).data.text))
    }
    n++
  }
  onProgress?.({ phase: 'read', done: n, total: files.length })
  return mergeStats(results)
}
