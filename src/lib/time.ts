/** "1:23:45", "45:30" oppure "52" (minuti) → secondi. Lettura "letterale", senza contesto. */
export function parseDuration(s: string): number | null {
  const t = s.trim().replace(/[.,]/g, ':')
  if (!t) return null
  const parts = t.split(':').map((p) => parseInt(p, 10))
  if (parts.some((p) => isNaN(p) || p < 0)) return null
  if (parts.length === 1) return parts[0] * 60
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

// Passo più veloce plausibile (secondi al km) per sport a piedi / sci
const MIN_PACE: Record<string, number> = { run: 150, trail: 180, hike: 300, xcski: 100 }
// Velocità massima plausibile (km/h) per sport in bici
const MAX_SPEED: Record<string, number> = { bike: 70, mtb: 50, spin: 70 }

/**
 * Lettura "intelligente" del tempo, come lo scrive una persona:
 * - "8h30", "8 h 30", "1h", "45min", "45'" sono sempre chiari;
 * - "8.30" / "8:30" di solito sono minuti:secondi, ma se con la distanza
 *   darebbero un passo impossibile per lo sport (es. escursione a 0:32/km)
 *   vengono letti come ore:minuti;
 * - senza distanza, "1.30" (meno di 5 "minuti") è letto come 1 h 30.
 */
export function parseTimeSmart(input: string, km: number | null, sport: string): number | null {
  const s = input.trim().toLowerCase()
  if (!s) return null
  const h = s.match(/^(\d+)\s*(?:h|std|ore?|hr?s?)\s*(\d{1,2})?\s*(?:m|min|')?$/)
  if (h) return parseInt(h[1], 10) * 3600 + (h[2] ? parseInt(h[2], 10) * 60 : 0)
  const m = s.match(/^(\d+)\s*(?:m|min|minuti|')$/)
  if (m) return parseInt(m[1], 10) * 60

  const literal = parseDuration(s)
  if (literal == null) return null
  const parts = s.replace(/[.,]/g, ':').split(':')
  if (parts.length !== 2) return literal
  const a = parseInt(parts[0], 10)
  const b = parseInt(parts[1], 10)
  if (b >= 60) return literal
  const asHours = a * 3600 + b * 60

  if (km && km > 0) {
    if (sport in MIN_PACE) {
      if (literal / km < MIN_PACE[sport]) return asHours
    } else if (sport in MAX_SPEED) {
      if (km / (literal / 3600) > MAX_SPEED[sport]) return asHours
    }
    return literal
  }
  return a < 5 ? asHours : literal
}

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.round(sec % 60)
  const p = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`
}

/** Testo leggibile per mostrare come è stato capito il tempo: "8 h 30 min", "52 min 30 s". */
export function humanDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.round(sec % 60)
  if (h) return `${h} h ${String(m).padStart(2, '0')} min${s ? ` ${s} s` : ''}`
  return `${m} min${s ? ` ${String(s).padStart(2, '0')} s` : ''}`
}
