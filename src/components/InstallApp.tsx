// Invito a installare PizKit come app (PWA).
// - Android / Chrome desktop: pulsante che apre il prompt di installazione del sistema
// - iPhone/iPad (Safari): istruzioni passo passo "Condividi → Aggiungi alla schermata Home"
// Non compare se l'app è già installata o se l'utente l'ha chiusa.
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { track } from '../lib/api'
import { platformLabel } from '../lib/visitor'
import { Logo } from './Logo'

interface BIPEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pk_install_dismissed'

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function dismissedRecently(): boolean {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0)
    return Date.now() - t < 7 * 24 * 3600 * 1000 // non insistere per 7 giorni
  } catch {
    return false
  }
}

let deferred: BIPEvent | null = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as BIPEvent
  window.dispatchEvent(new Event('pk-installable'))
})
window.addEventListener('appinstalled', () => {
  deferred = null
  track('app', 'installed')
})

export function InstallApp() {
  const { t } = useI18n()
  const ios = platformLabel() === 'ios'
  const [canPrompt, setCanPrompt] = useState(!!deferred)
  const [hidden, setHidden] = useState(() => isStandalone() || dismissedRecently())
  const [iosHelp, setIosHelp] = useState(false)

  useEffect(() => {
    const on = () => setCanPrompt(true)
    window.addEventListener('pk-installable', on)
    return () => window.removeEventListener('pk-installable', on)
  }, [])

  if (hidden || (!canPrompt && !ios)) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* ignora */
    }
    setHidden(true)
    setIosHelp(false)
    track('app', 'install_dismiss')
  }

  async function install() {
    track('app', 'install_click', { ios })
    if (ios) {
      setIosHelp(true)
      return
    }
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    track('app', 'install_' + outcome)
    deferred = null
    setHidden(true)
  }

  return (
    <>
      <div className="install card">
        <Logo size={44} />
        <div className="install-text">
          <strong>{t('app.title')}</strong>
          <span className="muted small">{t('app.text')}</span>
        </div>
        <div className="row">
          <button className="btn ghost small" onClick={dismiss}>
            {t('app.later')}
          </button>
          <button className="btn primary small" onClick={install}>
            📲 {t('app.install')}
          </button>
        </div>
      </div>

      {iosHelp && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setIosHelp(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <Logo size={40} />
              <h2>{t('app.title')}</h2>
            </div>
            <ol className="ios-steps">
              <li>
                <span className="ios-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12M8 7l4-4 4 4" />
                    <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
                  </svg>
                </span>
                {t('app.ios1')}
              </li>
              <li>
                <span className="ios-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="4" y="4" width="16" height="16" rx="4" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                </span>
                {t('app.ios2')}
              </li>
              <li>
                <span className="ios-icon" aria-hidden="true">✓</span>
                {t('app.ios3')}
              </li>
            </ol>
            <button className="btn primary" onClick={() => setIosHelp(false)}>
              {t('app.ok')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
