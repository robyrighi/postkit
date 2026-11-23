import { track } from './api'

/**
 * Da dove arriva il visitatore (Instagram, WhatsApp, Google…).
 * Si registra solo il nome del canale, mai l'indirizzo completo della pagina di provenienza.
 * Priorità: parametro ?da=… nel link > browser interno di un'app > sito di provenienza.
 */
export function detectChannel(): string {
  const da = new URLSearchParams(location.search).get('da')
  if (da && /^[a-z0-9_-]{1,24}$/i.test(da)) return da.toLowerCase()

  const ua = navigator.userAgent
  if (/Instagram/i.test(ua)) return 'instagram'
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook'
  if (/Strava/i.test(ua)) return 'strava'
  if (/WhatsApp/i.test(ua)) return 'whatsapp'
  if (/Telegram/i.test(ua)) return 'telegram'
  if (/LinkedInApp/i.test(ua)) return 'linkedin'

  let host = ''
  try {
    host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''
  } catch {
    host = ''
  }
  if (!host || host === location.hostname || host.endsWith('github.io')) return 'diretto'
  const map: [RegExp, string][] = [
    [/instagram\.com$/, 'instagram'],
    [/facebook\.com$|fb\.me$/, 'facebook'],
    [/whatsapp\.com$|wa\.me$/, 'whatsapp'],
    [/strava\.com$/, 'strava'],
    [/(^|\.)google\./, 'google'],
    [/bing\.com$|duckduckgo\.com$|ecosia\.org$|search\.brave\.com$|yahoo\./, 'ricerca'],
    [/t\.co$|twitter\.com$|x\.com$/, 'x'],
    [/linkedin\.com$|lnkd\.in$/, 'linkedin'],
    [/t\.me$|telegram\./, 'telegram'],
    [/garmin\.com$/, 'garmin'],
  ]
  for (const [re, name] of map) if (re.test(host)) return name
  return host.slice(0, 40)
}

/** Registra l'arrivo una volta per sessione e pulisce ?da= dalla barra degli indirizzi. */
export function trackArrival() {
  try {
    if (sessionStorage.getItem('pk_arrived')) return
    sessionStorage.setItem('pk_arrived', '1')
  } catch {
    /* storage non disponibile: registra comunque */
  }
  const ch = detectChannel()
  track('app', 'arrive', { ch })
  if (location.search.includes('da=')) {
    const url = new URL(location.href)
    url.searchParams.delete('da')
    history.replaceState(null, '', url.pathname + url.search + url.hash)
  }
}
