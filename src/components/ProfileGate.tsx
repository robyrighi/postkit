import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { register } from '../lib/api'
import { getProfile, saveProfile } from '../lib/visitor'

type Ensure = () => Promise<boolean>
const Ctx = createContext<Ensure>(async () => true)

/** Hook: chiede nome ed email solo la prima volta (al primo export). */
export const useEnsureProfile = () => useContext(Ctx)

export function ProfileGateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const ensure = useCallback<Ensure>(() => {
    if (getProfile()) return Promise.resolve(true)
    setOpen(true)
    return new Promise<boolean>((res) => {
      resolver.current = res
    })
  }, [])

  const close = (ok: boolean) => {
    setOpen(false)
    resolver.current?.(ok)
    resolver.current = null
  }

  return (
    <Ctx.Provider value={ensure}>
      {children}
      {open && <GateModal onDone={close} />}
    </Ctx.Provider>
  )
}

function GateModal({ onDone }: { onDone: (ok: boolean) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const valid =
    name.trim().length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) && consent

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    setErr('')
    try {
      await register(name.trim(), email.trim())
      saveProfile({ name: name.trim(), email: email.trim().toLowerCase() })
      onDone(true)
    } catch {
      // Se il server non risponde non blocchiamo l'utente: salviamo in locale
      // e riproveremo alla prossima visita.
      saveProfile({ name: name.trim(), email: email.trim().toLowerCase() })
      localStorage.setItem('pk_pending_register', '1')
      onDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <form className="modal" onSubmit={submit}>
        <h2 id="gate-title">Quasi fatto ✨</h2>
        <p className="muted">
          PostKit è gratuito. Ti chiediamo nome ed email <strong>una volta sola</strong>: ci aiutano a capire chi lo usa
          e ad avvisarti delle novità. Le tue foto restano sul tuo dispositivo.
        </p>
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={80} required />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            required
          />
        </label>
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            Ho letto l'<a href="#/privacy" target="_blank" rel="noreferrer">informativa privacy</a> e acconsento al
            trattamento dei miei dati.
          </span>
        </label>
        {err && <p className="error">{err}</p>}
        <div className="row end">
          <button type="button" className="btn ghost" onClick={() => onDone(false)} disabled={busy}>
            Annulla
          </button>
          <button type="submit" className="btn primary" disabled={!valid || busy}>
            {busy ? 'Un attimo…' : 'Continua'}
          </button>
        </div>
      </form>
    </div>
  )
}
