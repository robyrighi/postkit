import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Content Security Policy: solo il nostro sito, Supabase (statistiche) e il
// modello IA di MediaPipe. Applicata solo alla build (in dev Vite usa script inline).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self' https://ztgehpjliohcqtsuzdbq.supabase.co https://storage.googleapis.com",
  "worker-src 'self' blob:",
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

// GitHub Pages pubblica su https://robyrighi.github.io/postkit/
export default defineConfig({
  base: '/postkit/',
  plugins: [react(), csp()],
})
