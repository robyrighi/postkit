// Service worker di PeakKit: rende l'app installabile e utilizzabile offline.
// Nessuna foto passa di qui: vengono messe in cache solo le parti dell'app.
// Elenco generato in fase di build (vedi vite.config.ts): tutta l'app per l'uso offline
const PRECACHE = [] /*__PK_PRECACHE__*/
const VERSION = 'pk-' /*__PK_VERSION__*/
const CORE = ['./', './index.html', './manifest.webmanifest', ...PRECACHE]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Statistiche e login: sempre in rete, mai in cache
  if (url.hostname.endsWith('supabase.co')) return

  // Pagina: prima la rete (per avere sempre l'ultima versione), poi la cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((c) => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html', { ignoreVary: true })),
    )
    return
  }

  // File dell'app e modello IA: prima la cache, poi la rete
  const sameOrigin = url.origin === self.location.origin
  const aiModel = url.hostname === 'storage.googleapis.com' && url.pathname.includes('mediapipe-models')
  if (sameOrigin || aiModel) {
    event.respondWith(
      caches.match(req, { ignoreVary: true, ignoreSearch: false }).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(VERSION).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})
