import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n'
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
 * Il salvataggio parte direttamente dal click: su iPhone il menu di
 * condivisione funziona solo se aperto da un gesto dell'utente.
 */
export function ExportPanel({ module, files, zipName, onClose }: Props) {
  const { t } = useI18n()
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

  async function saveSingles() {
    for (const f of files) {
      await saveFiles([f], zipName)
      await new Promise((r) => setTimeout(r, 300))
    }
    setResult('downloaded')
    track(module, 'save', { count: files.length, how: 'single' })
  }

  const mainLabel = share
    ? t('exp.saveToPhotos')
    : many && !mobile
      ? t('exp.downloadZip')
      : many
        ? t('exp.downloadAll')
        : t('exp.download')

  return (
    <div className="card export" ref={box}>
      <div className="row between">
        <h3>{many ? t('exp.many', { n: files.length }) : t('exp.one')}</h3>
        <button className="btn ghost small" onClick={onClose} aria-label={t('exp.close')}>
          ✕
        </button>
      </div>
      <div className={'thumbs' + (many ? ' many' : '')}>
        {urls.map((u, i) => (
          <img key={u} src={u} alt={`${t('exp.preview')} ${i + 1}`} />
        ))}
      </div>
      <div className="row wrap">
        <button className="btn primary big" onClick={() => save()}>
          {mainLabel}
        </button>
        {many && !mobile && (
          <button className="btn ghost" onClick={saveSingles}>
            {t('exp.singles')}
          </button>
        )}
      </div>
      {share && (
        <p className="muted small">{many ? t('exp.shareHintMany', { n: files.length }) : t('exp.shareHintOne')}</p>
      )}
      {result && (
        <>
          <p className="ok">{t('exp.done')}</p>
          <Rating module={module} />
        </>
      )}
    </div>
  )
}
