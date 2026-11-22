import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n'
import { register, track } from '../lib/api'
import { getProfile, saveProfile } from '../lib/visitor'

// Quanti download si possono fare senza registrarsi
const FREE_DOWNLOADS = 1
const FREE_KEY = 'pk_free_used'

type Ensure = (module: string) => Promise<boolean>
const Ctx = createContext<Ensure>(async () => true)

/**
 * Hook: il primo download è libero; dal secondo chiede nome ed email
 * (una volta sola). Ogni passaggio viene registrato nelle statistiche.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useEnsureProfile = () => useContext(Ctx)

function freeUsed(): number {
  try {
    return Number(localStorage.getItem(FREE_KEY) || 0)
  } catch {
    return 0
  }
}

function markFreeUsed() {
  try {
    localStorage.setItem(FREE_KEY, String(freeUsed() + 1))
  } catch {
    /* ignora */
  }
}

export function ProfileGateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const resolver = useRef<((ok: boolean) => void) | null>(null)
  const fromModule = useRef('')

  const ensure = useCallback<Ensure>((module) => {
    if (getProfile()) return Promise.resolve(true)
    const used = freeUsed()
    if (used < FREE_DOWNLOADS) {
      markFreeUsed()
      track('gate', 'free_download', { from: module, n: used + 1 })
      return Promise.resolve(true)
    }
    fromModule.current = module
    track('gate', 'shown', { from: module })
    setOpen(true)
    return new Promise<boolean>((res) => {
      resolver.current = res
    })
  }, [])

  const close = (ok: boolean, newsletter?: boolean) => {
    track('gate', ok ? 'submit' : 'cancel', ok ? { from: fromModule.current, newsletter: !!newsletter } : { from: fromModule.current })
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

function GateModal({ onDone }: { onDone: (ok: boolean, newsletter?: boolean) => void }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [news, setNews] = useState(false)
  const [busy, setBusy] = useState(false)

  const valid = name.trim().length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) && consent

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    const profile = { name: name.trim(), email: email.trim().toLowerCase(), newsletter: news }
    try {
      await register(profile.name, profile.email, news)
    } catch {
      // Rete assente o errore: non blocchiamo l'utente, riproveremo alla prossima visita
      try {
        localStorage.setItem('pk_pending_register', '1')
      } catch {
        /* ignora */
      }
    }
    saveProfile(profile)
    setBusy(false)
    onDone(true, news)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <form className="modal" onSubmit={submit}>
        <h2 id="gate-title">{t('gate.title')}</h2>
        <p className="muted">{t('gate.text')}</p>
        <label>
          {t('gate.name')}
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={80} required />
        </label>
        <label>
          {t('gate.email')}
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
            {t('gate.consent1')}
            <a href="#/privacy" target="_blank" rel="noreferrer">
              {t('gate.consentLink')}
            </a>
            {t('gate.consent2')}
          </span>
        </label>
        <label className="check">
          <input type="checkbox" checked={news} onChange={(e) => setNews(e.target.checked)} />
          <span>{t('gate.newsletter')}</span>
        </label>
        <div className="row end">
          <button type="button" className="btn ghost" onClick={() => onDone(false)} disabled={busy}>
            {t('gate.cancel')}
          </button>
          <button type="submit" className="btn primary" disabled={!valid || busy}>
            {busy ? t('gate.wait') : t('gate.continue')}
          </button>
        </div>
      </form>
    </div>
  )
}
