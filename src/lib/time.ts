/** "1:23:45", "45:30" oppure "52" (minuti) → secondi */
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

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.round(sec % 60)
  const p = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`
}
