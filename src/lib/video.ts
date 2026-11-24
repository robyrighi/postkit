// Video nel browser: lettura, fotogramma d'anteprima e rendering con la grafica sopra.
// Tutto avviene sul dispositivo (WebCodecs + Mediabunny): il video non viene mai inviato a nessuno.
import type { Framing } from './image'

export const MAX_VIDEO_SEC = 60

export const isVideoFile = (f: File) => f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv)$/i.test(f.name)

type MB = typeof import('mediabunny')
let mbPromise: Promise<MB> | null = null
const mb = () => (mbPromise ??= import('mediabunny'))

/** true se il browser sa codificare video H.264 (iOS 16.4+, Chrome, Edge, Samsung, Firefox 130+). */
export async function videoSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !('VideoEncoder' in window) || !('VideoDecoder' in window)) return false
  try {
    const { canEncodeVideo } = await mb()
    return await canEncodeVideo('avc', { width: 1080, height: 1920 })
  } catch {
    return false
  }
}

export interface VideoInfo {
  file: File
  duration: number
  width: number
  height: number
}

async function openInput(file: File) {
  const m = await mb()
  const input = new m.Input({ source: new m.BlobSource(file), formats: m.ALL_FORMATS })
  const track = await input.getPrimaryVideoTrack()
  if (!track) throw new Error('Nessuna traccia video')
  return { m, input, track }
}

export async function openVideo(file: File): Promise<VideoInfo> {
  const { input, track } = await openInput(file)
  const duration = await input.computeDuration()
  return { file, duration, width: track.displayWidth, height: track.displayHeight }
}

/** Fotogramma al secondo t, come canvas normale (usato per anteprima e cornice). */
export async function frameAt(file: File, t: number): Promise<HTMLCanvasElement> {
  const { m, track } = await openInput(file)
  const sink = new m.CanvasSink(track, { poolSize: 0 })
  const first = await track.getFirstTimestamp()
  const wc = (await sink.getCanvas(Math.max(first, t))) ?? (await sink.getCanvas(first))
  if (!wc) throw new Error('Fotogramma non disponibile')
  const out = document.createElement('canvas')
  out.width = wc.canvas.width
  out.height = wc.canvas.height
  out.getContext('2d')!.drawImage(wc.canvas, 0, 0)
  return out
}

/** Disegna un fotogramma in modalità "cover" con zoom e spostamento (stessa logica delle foto). */
function drawSampleCover(
  ctx: CanvasRenderingContext2D,
  sample: import('mediabunny').VideoSample,
  w: number,
  h: number,
  f: Framing,
) {
  const sw = sample.displayWidth
  const sh = sample.displayHeight
  const scale = Math.max(w / sw, h / sh) * Math.max(1, f.zoom)
  const dw = sw * scale
  const dh = sh * scale
  const dx = (w - dw) / 2 + (f.x * (dw - w)) / 2
  const dy = (h - dh) / 2 + (f.y * (dh - h)) / 2
  sample.draw(ctx, dx, dy, dw, dh)
}

export interface RenderOptions {
  file: File
  width: number
  height: number
  framing: Framing
  /** Livello trasparente con testo/numeri, disegnato sopra ogni fotogramma */
  overlay: HTMLCanvasElement
  start: number
  end: number
  name: string
  onProgress?: (p: number) => void
}

export interface RenderJob {
  done: Promise<File>
  cancel: () => void
}

export function renderVideo(o: RenderOptions): RenderJob {
  let cancelFn: () => void = () => {}
  const done = (async () => {
    const m = await mb()
    const input = new m.Input({ source: new m.BlobSource(o.file), formats: m.ALL_FORMATS })
    const output = new m.Output({ format: new m.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new m.BufferTarget() })
    const c = document.createElement('canvas')
    c.width = o.width
    c.height = o.height
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    const aacOk = await m.canEncodeAudio('aac').catch(() => false)

    const conv = await m.Conversion.init({
      input,
      output,
      trim: { start: o.start, end: o.end },
      video: {
        codec: 'avc',
        quality: m.QUALITY_HIGH,
        forceTranscode: true,
        processedWidth: o.width,
        processedHeight: o.height,
        process: (sample) => {
          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, o.width, o.height)
          drawSampleCover(ctx, sample, o.width, o.height, o.framing)
          ctx.drawImage(o.overlay, 0, 0)
          return new m.VideoSample(c, { timestamp: sample.timestamp, duration: sample.duration })
        },
      },
      // L'audio originale si copia così com'è; se non è AAC si converte, se non si può resta muto.
      audio: (track) => (track.codec === 'aac' ? {} : aacOk ? { codec: 'aac' } : { discard: true }),
    })
    if (!conv.isValid) throw new Error('Conversione non valida')
    cancelFn = () => void conv.cancel()
    conv.onProgress = (p) => o.onProgress?.(p)
    await conv.execute()
    const buf = (output.target as InstanceType<MB['BufferTarget']>).buffer
    if (!buf) throw new Error('Video vuoto')
    return new File([buf], o.name, { type: 'video/mp4' })
  })()
  return { done, cancel: () => cancelFn() }
}
