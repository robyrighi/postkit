// Identificativo anonimo del dispositivo/browser: un UUID salvato in
// localStorage con un cookie di riserva. Nessun fingerprinting.
const ID_KEY = 'pk_vid'
const PROFILE_KEY = 'pk_profile'

export interface Profile {
  name: string
  email: string
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

function writeCookie(name: string, value: string) {
  const oneYear = 60 * 60 * 24 * 365
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${oneYear}; path=/; SameSite=Lax; Secure`
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* modalità privata o storage bloccato */
  }
}

function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

let cachedId: string | null = null

export function getVisitorId(): string {
  if (cachedId) return cachedId
  let id = safeGet(ID_KEY) ?? readCookie(ID_KEY)
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) id = uuid()
  safeSet(ID_KEY, id)
  writeCookie(ID_KEY, id)
  cachedId = id
  return id
}

export function getProfile(): Profile | null {
  const raw = safeGet(PROFILE_KEY)
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Profile
    return p.name && p.email ? p : null
  } catch {
    return null
  }
}

export function saveProfile(p: Profile) {
  safeSet(PROFILE_KEY, JSON.stringify(p))
}

export function platformLabel(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Windows/.test(ua)) return 'windows'
  if (/Macintosh/.test(ua)) return 'mac'
  if (/Linux/.test(ua)) return 'linux'
  return 'other'
}

export function isMobile(): boolean {
  const p = platformLabel()
  return p === 'ios' || p === 'android'
}
