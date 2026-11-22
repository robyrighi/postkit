import { lazy, Suspense, useEffect, useState } from 'react'
import { IconPanorama, IconSport, IconText } from './components/Icons'
import { isStandalone } from './components/InstallApp'
import { Logo } from './components/Logo'
import { ProfileGateProvider } from './components/ProfileGate'
import { I18nProvider, LANGS, useI18n, type Key, type Lang } from './i18n'
import { register, touchVisitor, track } from './lib/api'
import { getProfile } from './lib/visitor'
import { Home } from './pages/Home'
import { Privacy } from './pages/Privacy'

const SportCard = lazy(() => import('./modules/SportCard').then((m) => ({ default: m.SportCard })))
const TextStudio = lazy(() => import('./modules/TextStudio').then((m) => ({ default: m.TextStudio })))
const CarouselSplitter = lazy(() => import('./modules/CarouselSplitter').then((m) => ({ default: m.CarouselSplitter })))
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })))

// Ordine = ordine nel menu: lo sport è lo strumento principale
const ROUTES: { path: string; label: Key; Icon: () => React.ReactElement; el: () => React.ReactElement }[] = [
  { path: '/sport', label: 'nav.sport', Icon: () => <IconSport />, el: () => <SportCard /> },
  { path: '/testo', label: 'nav.text', Icon: () => <IconText />, el: () => <TextStudio /> },
  { path: '/panoramica', label: 'nav.carousel', Icon: () => <IconPanorama />, el: () => <CarouselSplitter /> },
]
// vecchi indirizzi ancora validi
const ALIASES: Record<string, string> = { '/carosello': '/panoramica' }

// Ritorno dal link email dell'area admin (token nell'hash): porta all'area admin
const authReturn = /access_token=|error_description=/.test(window.location.hash)

function useRoute() {
  const get = () => {
    const r = window.location.hash.replace(/^#/, '') || '/'
    return ALIASES[r] ?? r
  }
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const on = () => {
      setRoute(get())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    if (authReturn) setTimeout(() => (window.location.hash = '#/admin'), 400)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

function LangSwitch() {
  const { lang, setLang, t } = useI18n()
  return (
    <label className="lang-switch" title={t('lang.label')}>
      <span className="sr-only">{t('lang.label')}</span>
      <span aria-hidden="true">🌐</span>
      <select
        value={lang}
        onChange={(e) => {
          setLang(e.target.value as Lang)
          track('lang', 'change', { to: e.target.value })
        }}
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Shell() {
  const route = useRoute()
  const { t } = useI18n()

  useEffect(() => {
    touchVisitor()
    if (isStandalone()) track('app', 'open_standalone')
    // Registrazione rimasta in sospeso (es. rete assente al primo download)
    const p = getProfile()
    try {
      if (p && localStorage.getItem('pk_pending_register')) {
        register(p.name, p.email)
          .then(() => localStorage.removeItem('pk_pending_register'))
          .catch(() => {})
      }
    } catch {
      /* ignora */
    }
  }, [])

  useEffect(() => {
    if (route === '/' || route === '/privacy') track(route === '/' ? 'home' : 'privacy', 'open')
  }, [route])

  const r = ROUTES.find((x) => x.path === route)
  const page = r ? r.el() : route === '/privacy' ? <Privacy /> : route === '/admin' ? <Admin /> : <Home />

  return (
    <div className="app">
      <nav className="topbar">
        <a href="#/" className="brand">
          <Logo size={38} />
          <span className="brand-name">
            Post<span className="grad">Kit</span>
          </span>
        </a>
        <div className="nav-right">
          <div className="nav-links">
            {ROUTES.map((x) => (
              <a key={x.path} href={`#${x.path}`} className={route === x.path ? 'on' : ''}>
                <span className="nav-icon">
                  <x.Icon />
                </span>
                <span className="nav-text">{t(x.label)}</span>
              </a>
            ))}
          </div>
          <LangSwitch />
        </div>
      </nav>

      <main>
        <Suspense fallback={<div className="module muted">{t('loading')}</div>}>{page}</Suspense>
      </main>

      <footer className="footer">
        <p>{t('footer.privacy')}</p>
        <p>
          <a href="#/privacy">{t('footer.privacyLink')}</a> · {t('footer.made')} 🇨🇭
        </p>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <ProfileGateProvider>
        <Shell />
      </ProfileGateProvider>
    </I18nProvider>
  )
}
