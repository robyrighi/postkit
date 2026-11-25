import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { extractRoute, type Pt } from '../lib/routeFromShot'

/**
 * Schermata per prendere il tracciato da uno screenshot della mappa:
 * l'utente tocca la linea, vede in anteprima il "filo" trovato e conferma.
 * Restituisce i tratti in coordinate pixel dello screenshot.
 */
export function RouteShotPicker({ file, onDone }: { file: File; onDone: (segs: Pt[][] | null) => void }) {
  const { t } = useI18n()
  const canvas = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<{ bmp: ImageBitmap; data: ImageData } | null>(null)
  const [taps, setTaps] = useState<Pt[]>([])
  const [segs, setSegs] = useState<Pt[][] | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  // Decodifica dell'immagine
  useEffect(() => {
    let alive = true
    createImageBitmap(file)
      .then((bmp) => {
        const c = document.createElement('canvas')
        c.width = bmp.width
        c.height = bmp.height
        const x = c.getContext('2d', { willReadFrequently: true })!
        x.drawImage(bmp, 0, 0)
        if (alive) setImg({ bmp, data: x.getImageData(0, 0, bmp.width, bmp.height) })
      })
      .catch(() => alive && setMsg(t('routeShot.readError')))
    return () => {
      alive = false
    }
  }, [file, t])

  // Disegno: screenshot scurito + tracciato trovato in bianco + punti toccati
  useEffect(() => {
    const c = canvas.current
    if (!c || !img) return
    c.width = img.bmp.width
    c.height = img.bmp.height
    const x = c.getContext('2d')!
    x.drawImage(img.bmp, 0, 0)
    if (segs) {
      x.fillStyle = 'rgba(0,0,0,0.55)'
      x.fillRect(0, 0, c.width, c.height)
      x.lineJoin = 'round'
      x.lineCap = 'round'
      x.strokeStyle = '#fff'
      x.shadowColor = '#fff'
      x.shadowBlur = c.width * 0.01
      x.lineWidth = Math.max(4, c.width * 0.008)
      x.beginPath()
      for (const s of segs) s.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)))
      x.stroke()
      x.shadowBlur = 0
    }
    for (const [px, py] of taps) {
      x.beginPath()
      x.arc(px, py, c.width * 0.02, 0, Math.PI * 2)
      x.strokeStyle = '#22d3ee'
      x.lineWidth = c.width * 0.006
      x.stroke()
    }
  }, [img, segs, taps])

  function onTap(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!img || busy) return
    const r = e.currentTarget.getBoundingClientRect()
    const p: Pt = [((e.clientX - r.left) / r.width) * img.bmp.width, ((e.clientY - r.top) / r.height) * img.bmp.height]
    const next = [...taps, p]
    setBusy(true)
    setMsg('')
    // lascia ridisegnare il cerchio del tocco prima del calcolo
    setTimeout(() => {
      const res = extractRoute(img.data, next)
      if (res) {
        setTaps(next)
        setSegs(res.segments)
      } else if (!taps.length) {
        setMsg(t('routeShot.notFound'))
      } else {
        setMsg(t('routeShot.notFoundMore'))
      }
      setBusy(false)
    }, 30)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="rs-title">
      <div className="modal route-shot">
        <h2 id="rs-title">{t('routeShot.title')}</h2>
        <p className="muted small">{segs ? t('routeShot.hintMore') : t('routeShot.hint')}</p>
        <div className="route-shot-view">{img ? <canvas ref={canvas} onPointerDown={onTap} /> : <p className="muted">⏳</p>}</div>
        {busy && <p className="muted small">⏳ {t('routeShot.working')}</p>}
        {msg && <p className="error small">{msg}</p>}
        <div className="row end">
          {segs && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setTaps([])
                setSegs(null)
              }}
            >
              {t('routeShot.retry')}
            </button>
          )}
          <button type="button" className="btn ghost" onClick={() => onDone(null)}>
            {t('routeShot.cancel')}
          </button>
          <button type="button" className="btn primary" disabled={!segs} onClick={() => onDone(segs)}>
            {t('routeShot.use')}
          </button>
        </div>
      </div>
    </div>
  )
}
