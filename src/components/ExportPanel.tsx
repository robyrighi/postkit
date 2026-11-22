import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '../lib/api'
import { canShareFiles, saveFiles, type SaveResult } from '../lib/exporter'
import { isMobile } from '../lib/visitor'
import { Rating } from './Rating'

interface Props {
  module: string
  files: File[]
  zipName: string
  onClose: () => void
}

/**
 * Mostra le immagini pronte e il pulsante di salvataggio.
 * Il salvataggio avviene direttamente al click: su iPhone il menu di
 * condivisione funziona solo se aperto da un gesto dell'utente.
 */
export function ExportPanel({ module, files, zipName, onClose }: Props) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls])
  const [result, setResult] = useState<SaveResult | null>(null)
  const box = useRef<HTMLDivElement>(null)
  // porta subito in vista il pannello (su mobile altrimenti resta in fondo)
  useEffect(() => {
    box.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [files])

  const mobile = isMobile()
  const share = mobile && canShareFiles(files)
  const many = files.length > 1

  async function save(forceZip = false) {
    const r = await saveFiles(files, zipName, forceZip)
    if (r !== 'cancelled') {
      setResult(r)
      track(module, 'save', { count: files.length, how: r })
    }
  }

  return (
    <div className="card export" ref={box}>
      <div className="row between">
        <h3>
          {many ? `${files.length} immagini pronte` : 'Immagine pronta'}
        </h3>
        <button className="btn ghost small" onClick={onClose} aria-label="Chiudi">
          ✕
        </button>
      </div>
      <div className={'thumbs' + (many ? ' many' : '')}>
        {urls.map((u, i) => (
          <img key={u} src={u} alt={`Anteprima ${i + 1}`} />
        ))}
      </div>
      <div className="row wrap">
        {share ? (
          <button className="btn primary big" onClick={() => save()}>
            📲 Salva nelle Foto
          </button>
        ) : (
          <button className="btn primary big" onClick={() => save()}>
            ⬇️ {many && !mobile ? 'Scarica ZIP' : many ? 'Scarica tutte' : 'Scarica'}
          </button>
        )}
        {many && !mobile && (
          <button
            className="btn ghost"
            onClick={async () => {
              for (const f of files) {
                await saveFiles([f], zipName)
                await new Promise((r) => setTimeout(r, 300))
              }
              setResult('downloaded')
              track(module, 'save', { count: files.length, how: 'single' })
            }}
          >
            Scarica singole
          </button>
        )}
      </div>
      {share && (
        <p className="muted small">
          Nel menu che si apre scegli <strong>“Salva {many ? `${files.length} immagini` : 'immagine'}”</strong>.
          {many && ' Mantieni l’ordine quando le pubblichi come carosello.'}
        </p>
      )}
      {result && result !== 'cancelled' && (
        <>
          <p className="ok">Fatto! ✅</p>
          <Rating module={module} />
        </>
      )}
    </div>
  )
}
