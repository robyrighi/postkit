// Segmentazione del soggetto (persone) nel browser con MediaPipe.
// Nessuna immagine lascia il dispositivo: solo il modello viene scaricato.
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'
import { makeCanvas } from './image'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'

let segmenterPromise: Promise<ImageSegmenter> | null = null

function getSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}mediapipe`)
      const create = (delegate: 'GPU' | 'CPU') =>
        ImageSegmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: 'IMAGE',
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        })
      try {
        return await create('GPU')
      } catch {
        return await create('CPU')
      }
    })()
    segmenterPromise.catch(() => {
      segmenterPromise = null
    })
  }
  return segmenterPromise
}

/**
 * Restituisce un canvas della stessa dimensione di `source` in cui l'alfa
 * vale 255 sul soggetto e 0 sullo sfondo.
 */
export async function subjectMask(source: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const seg = await getSegmenter()
  // Lavoriamo su una copia ridotta: più veloce e il modello è 256x256
  const maxSide = 1024
  const k = Math.min(1, maxSide / Math.max(source.width, source.height))
  const small = makeCanvas(Math.round(source.width * k), Math.round(source.height * k))
  small.getContext('2d')!.drawImage(source, 0, 0, small.width, small.height)

  const result = seg.segment(small)
  const masks = result.confidenceMasks
  if (!masks || !masks.length) throw new Error('Nessuna maschera prodotta')
  // indice 0 = sfondo → soggetto = 1 - sfondo
  const bg = masks[0].getAsFloat32Array()
  const mw = masks[0].width
  const mh = masks[0].height

  const m = makeCanvas(mw, mh)
  const mctx = m.getContext('2d')!
  const img = mctx.createImageData(mw, mh)
  for (let i = 0; i < bg.length; i++) {
    // curva per bordi più netti ma non seghettati
    let a = 1 - bg[i]
    a = Math.min(1, Math.max(0, (a - 0.35) / 0.3))
    img.data[i * 4] = 255
    img.data[i * 4 + 1] = 255
    img.data[i * 4 + 2] = 255
    img.data[i * 4 + 3] = a * 255
  }
  mctx.putImageData(img, 0, 0)
  result.close()

  // Riporta alla dimensione originale con leggera sfumatura del bordo
  const out = makeCanvas(source.width, source.height)
  const octx = out.getContext('2d')!
  octx.imageSmoothingQuality = 'high'
  octx.drawImage(m, 0, 0, out.width, out.height)
  return out
}
