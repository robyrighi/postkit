import JSZip from 'jszip'
import { isMobile } from './visitor'

export function canvasToFile(canvas: HTMLCanvasElement, name: string, quality = 0.92): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Esportazione fallita'))
        resolve(new File([blob], name, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      quality,
    )
  })
}

export function canShareFiles(files: File[]): boolean {
  try {
    return !!navigator.canShare && navigator.canShare({ files })
  } catch {
    return false
  }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export type SaveResult = 'shared' | 'downloaded' | 'zipped' | 'cancelled'

/**
 * Salva i file nel modo giusto per il dispositivo.
 * - Mobile con Web Share API: menu nativo → "Salva immagine/i" nella galleria.
 *   DEVE essere chiamata direttamente dal click (iOS richiede il gesto utente),
 *   per questo i file vanno preparati PRIMA.
 * - Desktop: 1 file → download; più file → zip.
 */
export async function saveFiles(files: File[], zipName: string, forceZip = false): Promise<SaveResult> {
  if (isMobile() && !forceZip && canShareFiles(files)) {
    try {
      await navigator.share({ files })
      return 'shared'
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled'
      // altri errori: si prosegue con il download classico
    }
  }
  if (files.length === 1) {
    download(files[0], files[0].name)
    return 'downloaded'
  }
  if (isMobile() && !forceZip) {
    // Mobile senza share: scarica i file uno alla volta
    for (const f of files) {
      download(f, f.name)
      await new Promise((r) => setTimeout(r, 350))
    }
    return 'downloaded'
  }
  const zip = new JSZip()
  files.forEach((f) => zip.file(f.name, f))
  const blob = await zip.generateAsync({ type: 'blob' })
  download(blob, zipName)
  return 'zipped'
}

export function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}
