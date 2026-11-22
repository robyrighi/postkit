import { useState } from 'react'
import { rate } from '../lib/api'

const FACES = [
  { v: 1, e: '😡', l: 'Pessimo' },
  { v: 2, e: '😕', l: 'Scarso' },
  { v: 3, e: '😐', l: 'Così così' },
  { v: 4, e: '🙂', l: 'Buono' },
  { v: 5, e: '😍', l: 'Ottimo' },
]

const key = (m: string) => `pk_rated_${m}`

export function hasRated(module: string) {
  try {
    return localStorage.getItem(key(module)) === '1'
  } catch {
    return false
  }
}

export function Rating({ module }: { module: string }) {
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(hasRated(module))
  const [busy, setBusy] = useState(false)

  if (sent) return <div className="card rating done">Grazie per il feedback! 🙏</div>

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
      <h3>Come ti è sembrato?</h3>
      <div className="faces" role="radiogroup" aria-label="Valutazione">
        {FACES.map((f) => (
          <button
            key={f.v}
            type="button"
            role="radio"
            aria-checked={score === f.v}
            aria-label={f.l}
            title={f.l}
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
            placeholder="Cosa miglioreresti? (facoltativo)"
            value={comment}
            maxLength={1000}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
          <button className="btn primary" onClick={send} disabled={busy}>
            {busy ? 'Invio…' : 'Invia'}
          </button>
        </>
      )}
    </div>
  )
}
