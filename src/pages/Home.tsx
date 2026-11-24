import { InstallApp } from '../components/InstallApp'
import { useI18n, type Key } from '../i18n'
import { track } from '../lib/api'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../lib/config'

const B = import.meta.env.BASE_URL

interface Tool {
  href: string
  title: Key
  text: Key
  cta: Key
  img: (lang: string) => string
  popular?: boolean
}

const TOOLS: Tool[] = [
  {
    href: '#/sport',
    title: 'home.sport.title',
    text: 'home.sport.text',
    cta: 'home.sport.cta',
    img: (l) => `${B}showcase/sport-${l}.jpg`,
    popular: true,
  },
  {
    href: '#/testo',
    title: 'home.text.title',
    text: 'home.text.text',
    cta: 'home.text.cta',
    img: () => `${B}showcase/text.jpg`,
  },
  {
    href: '#/panoramica',
    title: 'home.carousel.title',
    text: 'home.carousel.text',
    cta: 'home.carousel.cta',
    img: () => `${B}showcase/panorama.jpg`,
  },
]

export function Home() {
  const { t, lang } = useI18n()
  return (
    <div className="home">
      <section className="hero">
        <p className="eyebrow">{t('home.eyebrow')}</p>
        <h1>
          {t('home.title1')}
          <br />
          <span className="grad">{t('home.title2')}</span>
        </h1>
        <p className="lead">{t('home.lead')}</p>
        <div className="hero-cta">
          <a href="#/sport" className="btn primary big" onClick={() => track('home', 'cta_main')}>
            🏃 {t('home.cta.main')}
          </a>
          <a
            href="#/sport"
            className="btn ghost"
            onClick={() => {
              track('home', 'cta_demo')
              try {
                sessionStorage.setItem('pk_demo', 'sport')
              } catch {
                /* storage non disponibile */
              }
            }}
          >
            👀 {t('home.cta.demo')}
          </a>
        </div>
      </section>

      <section className="tools">
        {TOOLS.map((tool) => (
          <a key={tool.href} href={tool.href} className={'tool' + (tool.popular ? ' popular' : '')}>
            <div className="tool-art">
              <img src={tool.img(lang)} alt={t(tool.title)} loading="lazy" decoding="async" />
              {tool.popular && <span className="tool-badge">⭐ {t('home.badge.popular')}</span>}
            </div>
            <div className="tool-body">
              <h2>{t(tool.title)}</h2>
              <p>{t(tool.text)}</p>
              <span className="btn primary">{t(tool.cta)} →</span>
            </div>
          </a>
        ))}
      </section>

      <InstallApp />

      <section className="trust">
        <div>
          <span className="trust-icon">🔒</span>
          <h3>{t('home.trust1.title')}</h3>
          <p>{t('home.trust1.text')}</p>
        </div>
        <div>
          <span className="trust-icon">✉️</span>
          <h3>{t('home.trust2.title')}</h3>
          <p>{t('home.trust2.text')}</p>
        </div>
        <div>
          <span className="trust-icon">📲</span>
          <h3>{t('home.trust3.title')}</h3>
          <p>{t('home.trust3.text')}</p>
        </div>
      </section>

      <a
        className="ig-cta"
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('home', 'instagram')}
      >
        <span className="ig-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
            </svg>
        </span>
        <span>
          <strong>{t('home.ig.title')}</strong>
          <span className="muted small">{INSTAGRAM_HANDLE} · {t('home.ig.text')}</span>
        </span>
      </a>
    </div>
  )
}
