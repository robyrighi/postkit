import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n'
import { register, track } from '../lib/api'
import { getProfile, saveProfile } from '../lib/visitor'

// I download sono SEMPRE liberi. Dopo un download, chi non ha ancora lasciato l'email
// vede (al massimo due volte) un invito facoltativo a ricevere le novità.
const DL_KEY = 'pk_free_used' // numero di download fatti su questo dispositivo
const DISMISS_KEY = 'pk_invite_dismissed' // "volte|timestamp dell'ultimo No grazie"
const SECOND_INVITE_AFTER = 10 // download prima di riproporre l'invito
const SECOND_INVITE_DAYS = 14 // giorni minimi prima di riproporlo

type Ensure = (module: string) => Promise<boolean>
const Ctx = createContext<Ensure>(async () => true)
const InviteCtx = createContext<() => void>(() => {})

/** Hook chiamato prima di ogni download: non blocca mai, conta e al caso propone l'invito. */
// eslint-disable-next-line react-refresh/only-export-components
export const useEnsureProfile = () => useContext(Ctx)
/** Apre l'invito alle novità via email (es. dal piè di pagina). */
// eslint-disable-next-line react-refresh/only-export-components
export const useOpenInvite = () => useContext(InviteCtx)

function readNum(key: string): number {
  try {
    return Number(localStorage.getItem(key) || 0)
  } catch {
    return 0
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* modalità privata: pazienza */
  }
}

function dismissInfo(): { times: number; at: number } {
  try {
    const [t, a] = (localStorage.getItem(DISMISS_KEY) || '0|0').split('|')
    return { times: Number(t) || 0, at: Number(a) || 0 }
  } catch {
    return { times: 0, at: 0 }
  }
}

function shouldInvite(downloads: number): boolean {
  if (getProfile()) return false
  const d = dismissInfo()
  if (d.times === 0) return downloads >= 1
  if (d.times === 1) return downloads >= SECOND_INVITE_AFTER && Date.now() - d.at > SECOND_INVITE_DAYS * 864e5
  return false
}

export function ProfileGateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const fromModule = useRef('')

  const show = useCallback((from: string) => {
    fromModule.current = from
    track('gate', 'shown', { from })
    setOpen(true)
  }, [])

  const ensure = useCallback<Ensure>(
    (module) => {
      const n = readNum(DL_KEY) + 1
      write(DL_KEY, String(n))
      track('gate', 'free_download', { from: module, n })
      // L'invito arriva dopo il download, senza fermarlo
      if (shouldInvite(n)) setTimeout(() => show(module), 1200)
      return Promise.resolve(true)
    },
    [show],
  )

  const openInvite = useCallback(() => show('footer'), [show])

  const close = (ok: boolean) => {
    track('gate', ok ? 'submit' : 'cancel', { from: fromModule.current })
    if (!ok && fromModule.current !== 'footer') {
      write(DISMISS_KEY, `${dismissInfo().times + 1}|${Date.now()}`)
    }
    setOpen(false)
  }

  return (
    <Ctx.Provider value={ensure}>
      <InviteCtx.Provider value={openInvite}>
        {children}
        {open && <InviteModal onDone={close} />}
      </InviteCtx.Provider>
    </Ctx.Provider>
  )
}

function InviteModal({ onDone }: { onDone: (ok: boolean) => void }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  // Anti-bot: campo trappola invisibile (le persone non lo vedono) e tempo minimo di compilazione
  const [trap, setTrap] = useState('')
  const [openedAt] = useState(() => Date.now())

  const nameOk = name.trim().length === 0 || name.trim().length >= 2
  const valid = nameOk && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) && consent

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    if (trap || Date.now() - openedAt < 1500) {
      // Probabile bot: non registriamo nulla
      track('gate', 'bot_blocked', { trap: !!trap })
      onDone(false)
      return
    }
    setBusy(true)
    const profile = { name: name.trim(), email: email.trim().toLowerCase(), newsletter: true }
    try {
      await register(profile.name, profile.email, true)
    } catch {
      // Rete assente o errore: riproveremo alla prossima visita
      write('pk_pending_register', '1')
    }
    saveProfile(profile)
    setBusy(false)
    setDone(true)
    setTimeout(() => onDone(true), 1600)
  }

  if (done) {
    return (
      <div className="modal-backdrop" role="dialog" aria-modal="true">
        <div className="modal">
          <h2>{t('gate.thanks')}</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <form className="modal" onSubmit={submit}>
        <h2 id="gate-title">{t('gate.title')}</h2>
        <p className="muted">{t('gate.text')}</p>
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
        <label>
          {t('gate.name')}
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" maxLength={80} />
        </label>
        <input
          className="hp-field"
          type="text"
          name="pk_hp_url"
          value={trap}
          onChange={(e) => setTrap(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
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
