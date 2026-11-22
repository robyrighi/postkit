import { InstallApp } from '../components/InstallApp'
import { useI18n, type Key } from '../i18n'

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
    </div>
  )
}
