import { useState } from 'react'
import { useI18n, type Key } from '../i18n'
import { rate } from '../lib/api'

const FACES: { v: number; e: string; l: Key }[] = [
  { v: 1, e: '😡', l: 'rate.f1' },
  { v: 2, e: '😕', l: 'rate.f2' },
  { v: 3, e: '😐', l: 'rate.f3' },
  { v: 4, e: '🙂', l: 'rate.f4' },
  { v: 5, e: '😍', l: 'rate.f5' },
]

const key = (m: string) => `pk_rated_${m}`

function hasRated(module: string) {
  try {
    return localStorage.getItem(key(module)) === '1'
  } catch {
    return false
  }
}

export function Rating({ module }: { module: string }) {
  const { t } = useI18n()
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(hasRated(module))
  const [busy, setBusy] = useState(false)

  if (sent) return <div className="card rating done">{t('rate.thanks')}</div>

  async function send() {
    if (!score) return
    setBusy(true)
    await rate(module, score, comment)
    try {
      localStorage.setItem(key(module), '1')
    } catch {
      /* ignora */
    }
    setBusy(false)
    setSent(true)
  }

  return (
    <div className="card rating">
      <h3>{t('rate.title')}</h3>
      <div className="faces" role="radiogroup" aria-label={t('rate.title')}>
        {FACES.map((f) => (
          <button
            key={f.v}
            type="button"
            role="radio"
            aria-checked={score === f.v}
            aria-label={t(f.l)}
            title={t(f.l)}
            className={'face' + (score === f.v ? ' on' : '')}
            onClick={() => setScore(f.v)}
          >
            {f.e}
          </button>
        ))}
      </div>
      {score > 0 && (
        <>
          <textarea
            placeholder={t('rate.ph')}
            value={comment}
            maxLength={1000}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <button className="btn primary" onClick={send} disabled={busy}>
            {busy ? t('rate.sending') : t('rate.send')}
          </button>
        </>
      )}
    </div>
  )
}
