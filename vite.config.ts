import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { FAQ, SEO, SEO_LANGS, SITE, type SeoLang } from './src/seo/data.ts'

// Content Security Policy: solo il nostro sito, Supabase (statistiche) e il
// modello IA di MediaPipe. Applicata solo alla build (in dev Vite usa script inline).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self' blob: https://ztgehpjliohcqtsuzdbq.supabase.co https://storage.googleapis.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

function csp(): Plugin {
  return {
    name: 'postkit-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta name="referrer"',
        `<meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer"`,
      )
    },
  }
}

// Inserisce nel service worker l'elenco dei file da salvare per l'uso offline
function precache(): Plugin {
  let files: string[] = []
  let outDir = 'dist'
  return {
    name: 'postkit-precache',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir
    },
    generateBundle(_o, bundle) {
      files = Object.keys(bundle).filter(
        (f) => /\.(js|css|woff2|svg|png|jpg|webmanifest)$/.test(f) && !f.endsWith('.map') && !f.includes('heic'),
      )
    },
    closeBundle() {
      const extra = ['icons/icon-192.png', 'icons/icon-512.png', 'icons/logo.svg', 'icons/apple-touch-icon.png',
        'showcase/sport-it.jpg', 'showcase/sport-en.jpg', 'showcase/sport-de.jpg', 'showcase/sport-fr.jpg',
        'showcase/text.jpg', 'showcase/panorama.jpg']
      const list = [...new Set([...files, ...extra])].map((f) => './' + f)
      const version = createHash('sha1').update(list.join('|')).digest('hex').slice(0, 10)
      const swPath = resolve(outDir, 'sw.js')
      const sw = readFileSync(swPath, 'utf8')
        .replace('[] /*__PK_PRECACHE__*/', JSON.stringify(list))
        .replace("'pk-' /*__PK_VERSION__*/", `'pk-${version}'`)
      writeFileSync(swPath, sw)
    },
  }
}

// GitHub Pages pubblica su https://pizkit.com/ (dominio personalizzato, file public/CNAME)

// Pagine per lingua (/it /de /fr /en) con titolo, descrizione, hreflang e FAQ per Google.
// La radice pizkit.com resta l'app che sceglie la lingua del telefono (x-default).
function seoPages(): Plugin {
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const hreflang = [
    ...SEO_LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE}/${l}/" />`),
    `<link rel="alternate" hreflang="x-default" href="${SITE}/" />`,
  ].join('\n    ')
  const faqLd = (l: SeoLang) =>
    `<script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: l,
      mainEntity: FAQ[l].map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    })}</script>`
  const page = (html: string, l: SeoLang, url: string) => {
    const s = SEO[l]
    const rep = (re: RegExp, val: string) => {
      if (!re.test(html)) throw new Error('seoPages: non trovato ' + re)
      html = html.replace(re, val)
    }
    rep(/<html lang="[^"]*">/, `<html lang="${s.htmlLang}">`)
    rep(/<title>[^<]*<\/title>/, `<title>${esc(s.title)}</title>`)
    rep(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(s.description)}" />`)
    rep(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(s.ogTitle)}" />`)
    rep(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(s.ogDescription)}" />\n    <meta property="og:locale" content="${s.ogLocale}" />`)
    rep(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`)
    rep(/<meta property="og:image:alt" content="[^"]*" \/>/, `<meta property="og:image:alt" content="${esc(s.ogAlt)}" />`)
    rep(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />\n    ${hreflang}`)
    rep(/<noscript>[\s\S]*?<\/noscript>/, `<noscript>\n      <h1>${esc(s.noscriptH1)}</h1>\n      <p>${esc(s.noscriptP)}</p>\n    </noscript>`)
    html = html.replace('</head>', `  ${faqLd(l)}\n  </head>`)
    return html
  }
  return {
    name: 'pk-seo-pages',
    apply: 'build',
    closeBundle() {
      const out = resolve(__dirname, 'dist')
      const base = readFileSync(resolve(out, 'index.html'), 'utf8')
      // radice: italiano + collegamenti alle altre lingue
      writeFileSync(resolve(out, 'index.html'), page(base, 'it', `${SITE}/`))
      for (const l of SEO_LANGS) {
        mkdirSync(resolve(out, l), { recursive: true })
        writeFileSync(resolve(out, l, 'index.html'), page(base, l, `${SITE}/${l}/`))
      }
      const alt = [...SEO_LANGS.map((l) => [l, `${SITE}/${l}/`]), ['x-default', `${SITE}/`]]
        .map(([l, u]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${u}"/>`)
        .join('\n')
      const today = new Date().toISOString().slice(0, 10)
      const urls = [`${SITE}/`, ...SEO_LANGS.map((l) => `${SITE}/${l}/`)]
        .map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n${alt}\n  </url>`)
        .join('\n')
      writeFileSync(
        resolve(out, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
      )
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [react(), csp(), precache(), seoPages()],
})
