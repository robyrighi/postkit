import { useEffect, useRef, useState } from 'react'
import { InstallApp } from '../components/InstallApp'
import { useI18n, type Key } from '../i18n'
import { track } from '../lib/api'
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../lib/config'
import { handOff } from '../lib/handoff'
import { FAQ, SEO, type SeoLang } from '../seo/data'

const B = import.meta.env.BASE_URL

// Icone essenziali (tratto, ereditano il colore)
const Ico = {
  upload: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
    </svg>
  ),
  shot: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M9 7h6M9 10.5h6M9 14h3.5" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  gift: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="8.5" width="17" height="4" rx="1" />
      <path d="M5 12.5v8h14v-8M12 8.5v12M12 8.5c-2-4-6-3.5-6-1.5s3 1.5 6 1.5c3 0 6 .5 6-1.5s-4-2.5-6 1.5" />
    </svg>
  ),
  save: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  ),
}

interface Tool {
  href: string
  title: Key
  short: Key
  img: (lang: string) => string
}

const SMALL_TOOLS: Tool[] = [
  { href: '#/testo', title: 'home.text.title', short: 'home.text.short', img: () => `${B}showcase/text.jpg` },
  { href: '#/panoramica', title: 'home.carousel.title', short: 'home.carousel.short', img: () => `${B}showcase/panorama.jpg` },
]

export function Home() {
  const { t, lang } = useI18n()
  const faqLang: SeoLang = lang
  const photoInput = useRef<HTMLInputElement>(null)
  const shotInput = useRef<HTMLInputElement>(null)
  const heroCta = useRef<HTMLDivElement>(null)
  const [showSticky, setShowSticky] = useState(false)

  // Il pulsante fisso compare solo quando quello in alto non si vede più
  // e sparisce quando si arriva al piè di pagina, per non coprire i link
  useEffect(() => {
    const el = heroCta.current
    const footer = document.querySelector('.footer')
    if (!el || !('IntersectionObserver' in window)) return
    let heroGone = false
    let footerVisible = false
    const update = () => setShowSticky(heroGone && !footerVisible)
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === el) heroGone = !e.isIntersecting && e.boundingClientRect.top < 0
        else footerVisible = e.isIntersecting
      }
      update()
    })
    io.observe(el)
    if (footer) io.observe(footer)
    return () => io.disconnect()
  }, [])

  const pickPhoto = (from: string) => {
    track('home', 'cta_main', { from })
    photoInput.current?.click()
  }

  return (
    <div className="home">
      {/* Selettori di file nascosti: si aprono dal tocco dell'utente, poi si passa allo strumento */}
      <input
        ref={photoInput}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          handOff({ photo: f })
          location.hash = '#/sport'
        }}
      />
      <input
        ref={shotInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const fs = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (!fs.length) return
          handOff({ shots: fs })
          location.hash = '#/sport'
        }}
      />

      <section className="hero2">
        <div className="hero2-text">
          <p className="kicker">{t('home.eyebrow')}</p>
          <h1 className="motto">
            {t('home.title1')}
            <br />
            <span className="accent">{t('home.title2')}</span>
          </h1>
          <p className="lead">{t('home.lead')}</p>
          <div className="hero2-cta" ref={heroCta}>
            <button type="button" className="btn primary big" onClick={() => pickPhoto('hero')}>
              <span className="ico">{Ico.upload}</span>
              {t('home.cta.main')}
            </button>
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
              {t('home.cta.demo')}
            </a>
          </div>
          <p className="trustline">{t('home.trustline')}</p>
        </div>

        {/* Prima / dopo: la foto si trasforma nella card */}
        <a href="#/sport" className="ba" aria-label={t('home.sport.title')} onClick={() => track('home', 'ba_click')}>
          <img src={`${B}hero/before.jpg`} alt="" className="ba-before" decoding="async" />
          <img src={`${B}hero/after-${lang}.jpg`} alt={t('home.sport.title')} className="ba-after" decoding="async" />
          <span className="ba-tag ba-tag-before">{t('home.before')}</span>
          <span className="ba-tag ba-tag-after">{t('home.after')}</span>
        </a>
      </section>

      <button type="button" className="shot-cta" onClick={() => (track('home', 'cta_shot'), shotInput.current?.click())}>
        <span className="ico">{Ico.shot}</span>
        <span>
          <strong>{t('home.shot.title')}</strong>
          <span className="muted small">{t('home.shot.text')}</span>
        </span>
        <span className="ico go">{Ico.arrow}</span>
      </button>

      <h2 className="section-title">{t('home.tools.title')}</h2>
      <section className="bento">
        <a href="#/sport" className="tile tile-big" onClick={() => track('home', 'tool', { t: 'sport' })}>
          <img src={`${B}showcase/sport-${lang}.jpg`} alt="" loading="lazy" decoding="async" />
          <span className="tile-badge">{t('home.badge.popular')}</span>
          <span className="tile-body">
            <strong>{t('home.sport.title')}</strong>
            <span>{t('home.sport.short')}</span>
          </span>
        </a>
        {SMALL_TOOLS.map((tool, i) => (
          <a
            key={tool.href}
            href={tool.href}
            className={'tile' + (i === 1 ? ' tile-accent' : '')}
            onClick={() => track('home', 'tool', { t: tool.href.slice(2) })}
          >
            <img src={tool.img(lang)} alt="" loading="lazy" decoding="async" />
            <span className="tile-body">
              <strong>{t(tool.title)}</strong>
              <span>{t(tool.short)}</span>
            </span>
          </a>
        ))}
      </section>

      <InstallApp />

      <section className="trust">
        <div>
          <span className="trust-icon">{Ico.lock}</span>
          <h3>{t('home.trust1.title')}</h3>
          <p>{t('home.trust1.text')}</p>
        </div>
        <div>
          <span className="trust-icon">{Ico.gift}</span>
          <h3>{t('home.trust2.title')}</h3>
          <p>{t('home.trust2.text')}</p>
        </div>
        <div>
          <span className="trust-icon">{Ico.save}</span>
          <h3>{t('home.trust3.title')}</h3>
          <p>{t('home.trust3.text')}</p>
        </div>
      </section>

      <section className="faq">
        <h2>{SEO[faqLang].faqTitle}</h2>
        {FAQ[faqLang].map((f) => (
          <details
            key={f.q}
            onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && track('home', 'faq', { q: f.q.slice(0, 40) })}
          >
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>

      <a
        className="ig-cta"
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('home', 'instagram')}
      >
        <span className="ig-icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
          </svg>
        </span>
        <span>
          <strong>{t('home.ig.title')}</strong>
          <span className="muted small">
            {INSTAGRAM_HANDLE} · {t('home.ig.text')}
          </span>
        </span>
      </a>

      {/* Pulsante fisso in basso su telefono, a portata di pollice */}
      <div className={'sticky-cta' + (showSticky ? ' show' : '')} aria-hidden={!showSticky}>
        <button type="button" className="btn primary big" tabIndex={showSticky ? 0 : -1} onClick={() => pickPhoto('sticky')}>
          <span className="ico">{Ico.upload}</span>
          {t('home.cta.main')}
        </button>
      </div>
    </div>
  )
}
