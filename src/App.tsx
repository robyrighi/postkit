import { lazy, Suspense, useEffect, useState } from 'react'
import { ProfileGateProvider } from './components/ProfileGate'
import { register, touchVisitor, track } from './lib/api'
import { REPO_URL } from './lib/config'
import { getProfile } from './lib/visitor'

const CarouselSplitter = lazy(() => import('./modules/CarouselSplitter').then((m) => ({ default: m.CarouselSplitter })))
const TextStudio = lazy(() => import('./modules/TextStudio').then((m) => ({ default: m.TextStudio })))
const SportCard = lazy(() => import('./modules/SportCard').then((m) => ({ default: m.SportCard })))
import { Home } from './pages/Home'
import { Privacy } from './pages/Privacy'

const ROUTES: Record<string, { label: string; short: string; el: () => React.ReactElement }> = {
  '/carosello': { label: 'Carosello', short: '🎞️', el: () => <CarouselSplitter /> },
  '/testo': { label: 'Testo', short: '✍️', el: () => <TextStudio /> },
  '/sport': { label: 'Sport', short: '🏃', el: () => <SportCard /> },
}

function useRoute() {
  const get = () => window.location.hash.replace(/^#/, '') || '/'
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const on = () => {
      setRoute(get())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export default function App() {
  const route = useRoute()

  useEffect(() => {
    touchVisitor()
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

  const page = ROUTES[route]?.el() ?? (route === '/privacy' ? <Privacy /> : <Home />)

  return (
    <ProfileGateProvider>
      <div className="app">
        <nav className="topbar">
          <a href="#/" className="brand">
            <span className="logo">P</span>
            <span>PostKit</span>
          </a>
          <div className="nav-links">
            {Object.entries(ROUTES).map(([path, r]) => (
              <a key={path} href={`#${path}`} className={route === path ? 'on' : ''}>
                <span className="nav-emoji">{r.short}</span>
                <span className="nav-text">{r.label}</span>
              </a>
            ))}
          </div>
        </nav>

        <main>
          <Suspense fallback={<div className="module muted">Carico…</div>}>{page}</Suspense>
        </main>

        <footer className="footer">
          <p>
            🔒 Le tue foto non lasciano mai il tuo dispositivo · Nome ed email solo per scaricare
          </p>
          <p>
            <a href="#/privacy">Privacy</a> · <a href={REPO_URL}>Codice sorgente</a> · Fatto in Ticino 🇨🇭
          </p>
        </footer>
      </div>
    </ProfileGateProvider>
  )
}
