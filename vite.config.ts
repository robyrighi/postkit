import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

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
export default defineConfig({
  base: '/',
  plugins: [react(), csp(), precache()],
})
