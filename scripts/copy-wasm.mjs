// Copia i file WASM di MediaPipe in public/mediapipe, così vengono serviti
// dal nostro sito e non da un CDN esterno.
import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const dst = join(root, 'public', 'mediapipe')

if (!existsSync(src)) {
  console.error('MediaPipe wasm non trovato:', src)
  process.exit(1)
}
mkdirSync(dst, { recursive: true })
for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm']) {
  cpSync(join(src, f), join(dst, f))
}
console.log('MediaPipe wasm copiato in public/mediapipe')

// ONNX Runtime Web (gomma magica): file wasm serviti dal nostro sito
const ortSrc = join(root, 'node_modules', 'onnxruntime-web', 'dist')
const ortDst = join(root, 'public', 'ort')
mkdirSync(ortDst, { recursive: true })
for (const f of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
  cpSync(join(ortSrc, f), join(ortDst, f))
}
console.log('ONNX Runtime wasm copiato in public/ort')

// Tesseract.js (lettura degli screenshot): worker, motore e lingua serviti dal nostro sito
const ocrDst = join(root, 'public', 'ocr')
mkdirSync(join(ocrDst, 'lang'), { recursive: true })
cpSync(join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'), join(ocrDst, 'worker.min.js'))
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js']) {
  cpSync(join(root, 'node_modules', 'tesseract.js-core', f), join(ocrDst, f))
}
cpSync(join(root, 'node_modules', '@tesseract.js-data', 'eng', '4.0.0_best_int', 'eng.traineddata.gz'), join(ocrDst, 'lang', 'eng.traineddata.gz'))
console.log('Tesseract copiato in public/ocr')
