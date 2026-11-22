import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from './config'
import { getVisitorId, platformLabel } from './visitor'

// La sessione viene salvata solo se l'amministratore fa login nell'area admin.
// I visitatori normali non hanno mai una sessione.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'pk_admin_auth' },
})

// Tutte le chiamate di tracking sono "fire and forget": un errore di rete non
// deve mai bloccare l'utente.
async function rpc(fn: string, args: Record<string, unknown>) {
  try {
    const { error } = await supabase.rpc(fn, args)
    if (error) console.warn(`[peakkit] ${fn}:`, error.message)
    return !error
  } catch (e) {
    console.warn(`[peakkit] ${fn}:`, e)
    return false
  }
}

export function touchVisitor() {
  return rpc('pk_touch_visitor', {
    p_id: getVisitorId(),
    p_platform: platformLabel(),
    p_user_agent: navigator.userAgent,
    p_lang: navigator.language,
  })
}

export function track(module: string, event: string, meta?: Record<string, unknown>) {
  return rpc('pk_track', { p_id: getVisitorId(), p_module: module, p_event: event, p_meta: meta ?? null })
}

export async function register(name: string, email: string, newsletter: boolean) {
  const { error } = await supabase.rpc('pk_register', {
    p_id: getVisitorId(),
    p_name: name,
    p_email: email,
    p_newsletter: newsletter,
  })
  if (error) throw new Error(error.message)
}

export function rate(module: string, score: number, comment: string) {
  return rpc('pk_rate', { p_id: getVisitorId(), p_module: module, p_score: score, p_comment: comment })
}
