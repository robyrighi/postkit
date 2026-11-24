// Interpreta il testo letto (OCR) da screenshot di Garmin Connect, Strava e simili.
// Riconosce le etichette in italiano, tedesco, francese e inglese. Tutto avviene sul dispositivo.

export interface ParsedStats {
  sport?: 'run' | 'trail' | 'xcski' | 'bike' | 'mtb' | 'hike' | 'spin'
  distanceKm?: number
  durationSec?: number
  elevGain?: number
  avgHr?: number
  maxHr?: number
  kcal?: number
  avgPower?: number
  te?: number
  /** tempo trovato senza etichetta (meno affidabile) */
  durationGuess?: number
  /** secondi Z1..Z5 */
  zones?: (number | undefined)[]
}

const TIME = /(?<![\d:.])(\d{1,2}):([0-5]\d)(?::([0-5]\d))?(?![\d:])/
const TIME_G = new RegExp(TIME.source, 'g')

const toSec = (m: RegExpMatchArray) =>
  m[3] !== undefined ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : Number(m[1]) * 60 + Number(m[2])

const num = (s: string) => {
  // "10,52" / "10.52" / "1'234" / "1,234" (migliaia) → numero
  const t = s.replace(/['’\s\u202f]/g, '')
  if (/^\d{1,3}([.,]\d{3})+$/.test(t) && !/^\d+[.,]\d{1,2}$/.test(t)) return Number(t.replace(/[.,]/g, ''))
  return Number(t.replace(',', '.'))
}

// Etichette (senza accenti: il testo viene normalizzato)
const L = {
  moving: /(tempo in movimento|moving time|bewegungszeit|temps de deplacement|temps en mouvement)/,
  totalTime: /(tempo totale|tempo trascorso|total time|elapsed time|gesamtzeit|verstrichene zeit|zeit|temps total|temps ecoule|duree|durata|^tempo\b|\btime\b|\bdauer\b)/,
  distance: /(distanza|distance|distanz|strecke)/,
  elev: /(dislivello|ascesa|guadagno di quota|elevation gain|elev gain|total ascent|hohenmeter|aufstieg|anstieg|denivele|montee|positive)/,
  avgHr: /((frequenza cardiaca|fc|freq\.? card\.?|heart rate|hr|herzfrequenz|frequence cardiaque|fc) ?(media|avg|average|moy|moyenne|durchschn)|(media|avg\.?|average|durchschn\.?|moyenne|ø|0) ?(frequenza cardiaca|heart rate|hr|herzfrequenz|hf|frequence cardiaque|fc))/,
  maxHr: /((frequenza cardiaca|heart rate|hr|herzfrequenz|frequence cardiaque|fc) ?(max|massima|maximum|maximale)|(max\.?|maximum|maximale) ?(frequenza cardiaca|heart rate|hr|herzfrequenz|frequence cardiaque|fc))/,
  kcal: /(calorie|calories|kalorien|energie|kcal)/,
  power: /((potenza|power|leistung|puissance) ?(media|avg|average|moyenne|durchschn)|(avg\.?|average|durchschn\.?|ø) ?(power|leistung))/,
  te: /(aerobic|aerobico|aerob|aerobie)/,
  zone: /\b(zona|zone|z)\s*([1-5]|b|s)\b/,
}

const SPORTS: [RegExp, ParsedStats['sport']][] = [
  [/(ciclismo indoor|indoor cycling|indoor-radfahren|cyclisme en salle|spinning|virtual ride|indoor bike)/, 'spin'],
  [/(trail run|corsa su sentiero|trail)/, 'trail'],
  [/(sci di fondo|skating|cross country ski|xc ski|nordic ski|langlauf|ski de fond|backcountry)/, 'xcski'],
  [/(mountain bike|mtb|vtt|mountainbike)/, 'mtb'],
  [/(escursion|hiking|hike|wandern|randonnee|camminata|walk)/, 'hike'],
  [/(ciclismo|cycling|\bride\b|radfahren|\bvelo\b|cyclisme|bici)/, 'bike'],
  [/(corsa|running|\brun\b|laufen|lauf|course a pied|footing)/, 'run'],
]

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Cerca un valore vicino all'etichetta: stessa riga (dopo l'etichetta), poi riga sopra e riga sotto. */
// numero con eventuale separatore delle migliaia (spazio, apostrofo, punto, virgola)
const BIG = String.raw`(\d{1,3}(?:[ '.,’\u202f]\d{3})+|\d+(?:[.,]\d+)?)`
const PACE = /\/\s*(km|mi|100\s*m|h)\b|km\/h|min\/|mph/
function near(lines: string[], i: number, after: string, re: RegExp): RegExpMatchArray | null {
  const same = after.match(re)
  if (same) return same
  for (const j of [i - 1, i + 1, i + 2]) {
    if (j < 0 || j >= lines.length) continue
    // un tempo vicino a "/km" è un passo, non una durata
    if (re === TIME && PACE.test(lines[j])) continue
    const m = lines[j].match(re)
    if (m) return m
  }
  return null
}

export function parseStats(text: string): ParsedStats {
  const raw = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const lines = raw.map(norm)
  const out: ParsedStats = {}

  for (const [re, sp] of SPORTS) {
    if (lines.slice(0, 8).some((l) => re.test(l))) {
      out.sport = sp
      break
    }
  }

  lines.forEach((l, i) => {
    const after = (re: RegExp) => {
      const m = l.match(re)
      return m ? l.slice((m.index ?? 0) + m[0].length) : ''
    }
    // tempo: il "tempo in movimento" vince sul totale
    if (L.moving.test(l)) {
      const m = near(lines, i, after(L.moving), TIME)
      if (m) out.durationSec = toSec(m)
    } else if (out.durationSec === undefined && L.totalTime.test(l) && !/(zone|zona|h:m:s|\(h)/.test(l)) {
      const m = near(lines, i, after(L.totalTime), TIME)
      if (m) out.durationSec = toSec(m)
    }
    if (out.distanceKm === undefined && L.distance.test(l)) {
      const m = near(lines, i, after(L.distance), /(\d+(?:[.,]\d+)?)\s*(km|mi)\b/)
      if (m) {
        const v = num(m[1]) * (m[2] === 'mi' ? 1.609344 : 1)
        if (v > 0) out.distanceKm = Math.round(v * 100) / 100
      }
    }
    if (out.elevGain === undefined && L.elev.test(l)) {
      const m = near(lines, i, after(L.elev), new RegExp(BIG + String.raw`\s*m\b`))
      if (m) out.elevGain = Math.round(num(m[1]))
    }
    if (L.maxHr.test(l) && out.maxHr === undefined) {
      const m = near(lines, i, after(L.maxHr), /(\d{2,3})\s*bpm/)
      if (m) out.maxHr = Number(m[1])
    } else if (L.avgHr.test(l) && out.avgHr === undefined) {
      const m = near(lines, i, after(L.avgHr), /(\d{2,3})\s*bpm/)
      if (m) out.avgHr = Number(m[1])
    }
    if (out.kcal === undefined && L.kcal.test(l) && !/kcal\/h/.test(l)) {
      const a = after(L.kcal)
      const m = a.match(new RegExp(BIG)) ?? near(lines, i, '', new RegExp(String.raw`^\s*` + BIG + String.raw`\s*(kcal|cal)?\s*$`))
      if (m) {
        const v = Math.round(num(m[1]))
        if (v > 0 && v < 20000) out.kcal = v
      }
    }
    if (out.avgPower === undefined && L.power.test(l)) {
      const m = near(lines, i, after(L.power), /(\d{2,4})\s*w\b/)
      if (m) out.avgPower = Number(m[1])
    }
    if (out.te === undefined && L.te.test(l) && !/anaerob/.test(l.slice(0, (l.match(L.te)?.index ?? 0) + 5))) {
      const m = l.match(/\b([0-5][.,]\d)\b/)
      if (m) out.te = num(m[1])
    }
  })

  // "Frequenza cardiaca" con "136 bpm 167 bpm" e sotto "Media Max"
  if (out.avgHr === undefined) {
    const i = lines.findIndex((l) => /(\d{2,3})\s*bpm\s+(\d{2,3})\s*bpm/.test(l))
    if (i >= 0 && /(media|avg|average|moy|durchschn)/.test(lines[i + 1] ?? '')) {
      const m = lines[i].match(/(\d{2,3})\s*bpm\s+(\d{2,3})\s*bpm/)!
      out.avgHr = Number(m[1])
      out.maxHr ??= Number(m[2])
    }
  }
  // Training Effect su due righe: "4.2 1.3" sopra "Aerobico Anaerobico"
  if (out.te === undefined) {
    const i = lines.findIndex((l, k) => k > 0 && /^\W*(aerob)/.test(l) && /anaerob/.test(l))
    const m = i > 0 ? lines[i - 1].match(/\b([0-5][.,]\d)\b/) : null
    if (m) out.te = num(m[1])
  }

  // Zone cardiache: "Zona 5 …" seguita dal tempo (stessa riga o riga sotto)
  const zones: (number | undefined)[] = [undefined, undefined, undefined, undefined, undefined]
  let found = 0
  let lastZ = 0
  lines.forEach((l, i) => {
    const m = l.match(L.zone)
    if (!m) return
    let z = Number(m[2])
    if (!z) z = lastZ ? lastZ - 1 : 5 // cifra illeggibile: Garmin elenca Z5 → Z1
    lastZ = z
    if (z < 1 || z > 5) return
    // il tempo non deve essere un valore in bpm: cerco dopo "bpm" o nella riga successiva
    const rest = l.slice((m.index ?? 0) + m[0].length).replace(/\d{2,3}\s*-\s*\d{2,3}\s*bpm|[<>]?\s*\d{2,3}\s*bpm/g, '')
    const t = rest.match(TIME) ?? (lines[i + 1] && !L.zone.test(lines[i + 1]) ? lines[i + 1].match(TIME) : null)
    if (t) {
      zones[z - 1] = toSec(t)
      found++
    }
  })
  if (found >= 2) out.zones = zones

  // Nessuna etichetta di tempo: il tempo più lungo, escludendo orologio di stato, assi dei grafici, passo e zone
  if (out.durationSec === undefined) {
    let best = 0
    lines.forEach((l, i) => {
      if (i < 2) return
      if (/(\d{1,2}:\d{2}.*){3,}/.test(l) || /\/km|\/mi|min\/|ritmo|pace|tempo\b.*\/|%/.test(l)) return
      if (L.zone.test(l) || (i > 0 && L.zone.test(lines[i - 1]))) return
      for (const m of l.matchAll(TIME_G)) best = Math.max(best, toSec(m))
    })
    if (best >= 60) out.durationGuess = best
  }
  return out
}

/** Unisce i risultati di più screenshot / più letture: il primo valore trovato vince. */
export function mergeStats(list: ParsedStats[]): ParsedStats {
  const out: ParsedStats = {}
  for (const s of list) {
    for (const k of Object.keys(s) as (keyof ParsedStats)[]) {
      if (k === 'zones' || k === 'durationGuess') continue
      if (out[k] === undefined && s[k] !== undefined) (out as Record<string, unknown>)[k] = s[k]
    }
    if (s.zones) {
      out.zones ??= [undefined, undefined, undefined, undefined, undefined]
      s.zones.forEach((v, i) => {
        if (out.zones![i] === undefined && v !== undefined) out.zones![i] = v
      })
    }
  }
  if (out.durationSec === undefined) {
    const g = list.map((s) => s.durationGuess).filter((x): x is number => !!x)
    if (g.length) out.durationSec = Math.max(...g)
  }
  return out
}
