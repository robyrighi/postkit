import { ensureFont, setSpacing, wrapLines } from './image'

export type Align = 'left' | 'center' | 'right'
export type Overlay = 'none' | 'bottom' | 'top' | 'dim' | 'vignette'

export interface TextTemplate {
  id: string
  label: string
  font: string
  weight: number
  italic?: boolean
  upper?: boolean
  spacing: number // em
  lineHeight: number
  size: number // frazione della larghezza
  subFont: string
  subWeight: number
  subUpper?: boolean
  subSpacing: number
  subSize: number
  align: Align
  y: number // 0..1 posizione verticale predefinita
  overlay: Overlay
  shadow: boolean
  band?: boolean // testo su fascia colorata
  quote?: boolean
  color: string
}

export const TEXT_TEMPLATES: TextTemplate[] = [
  {
    id: 'impact',
    label: 'Impatto',
    font: 'Bebas Neue',
    weight: 400,
    upper: true,
    spacing: 0.02,
    lineHeight: 0.9,
    size: 0.24,
    subFont: 'Montserrat',
    subWeight: 600,
    subUpper: true,
    subSpacing: 0.3,
    subSize: 0.032,
    align: 'center',
    y: 0.3,
    overlay: 'none',
    shadow: true,
    color: '#ffffff',
  },
  {
    id: 'elegant',
    label: 'Elegante',
    font: 'Playfair Display',
    weight: 700,
    italic: true,
    spacing: 0,
    lineHeight: 1.05,
    size: 0.12,
    subFont: 'Montserrat',
    subWeight: 500,
    subUpper: true,
    subSpacing: 0.35,
    subSize: 0.028,
    align: 'center',
    y: 0.78,
    overlay: 'bottom',
    shadow: false,
    color: '#ffffff',
  },
  {
    id: 'editorial',
    label: 'Editoriale',
    font: 'DM Serif Display',
    weight: 400,
    spacing: -0.01,
    lineHeight: 1.0,
    size: 0.13,
    subFont: 'Inter',
    subWeight: 500,
    subSpacing: 0.02,
    subSize: 0.034,
    align: 'left',
    y: 0.8,
    overlay: 'bottom',
    shadow: false,
    color: '#ffffff',
  },
  {
    id: 'quote',
    label: 'Citazione',
    font: 'Playfair Display',
    weight: 500,
    italic: true,
    spacing: 0,
    lineHeight: 1.2,
    size: 0.075,
    subFont: 'Montserrat',
    subWeight: 600,
    subUpper: true,
    subSpacing: 0.25,
    subSize: 0.026,
    align: 'center',
    y: 0.5,
    overlay: 'dim',
    shadow: false,
    quote: true,
    color: '#ffffff',
  },
  {
    id: 'band',
    label: 'Fascia',
    font: 'Oswald',
    weight: 700,
    upper: true,
    spacing: 0.01,
    lineHeight: 1.05,
    size: 0.1,
    subFont: 'Oswald',
    subWeight: 400,
    subUpper: true,
    subSpacing: 0.12,
    subSize: 0.035,
    align: 'left',
    y: 0.72,
    overlay: 'none',
    shadow: false,
    band: true,
    color: '#ffd400',
  },
  {
    id: 'minimal',
    label: 'Minimal',
    font: 'Inter',
    weight: 800,
    spacing: -0.03,
    lineHeight: 0.98,
    size: 0.11,
    subFont: 'Inter',
    subWeight: 400,
    subSpacing: 0,
    subSize: 0.034,
    align: 'left',
    y: 0.12,
    overlay: 'top',
    shadow: false,
    color: '#ffffff',
  },
  {
    id: 'hand',
    label: 'Scritto a mano',
    font: 'Caveat',
    weight: 700,
    spacing: 0,
    lineHeight: 1.0,
    size: 0.15,
    subFont: 'Caveat',
    subWeight: 400,
    subSpacing: 0,
    subSize: 0.06,
    align: 'center',
    y: 0.82,
    overlay: 'vignette',
    shadow: true,
    color: '#ffffff',
  },
]

export const FONTS_TO_LOAD: [string, number][] = [
  ['Bebas Neue', 400],
  ['Playfair Display', 500],
  ['Playfair Display', 700],
  ['DM Serif Display', 400],
  ['Oswald', 400],
  ['Oswald', 700],
  ['Inter', 400],
  ['Inter', 500],
  ['Inter', 700],
  ['Inter', 800],
  ['Montserrat', 500],
  ['Montserrat', 600],
  ['Montserrat', 700],
  ['Caveat', 400],
  ['Caveat', 700],
]

let fontsReady: Promise<void> | null = null
export function loadAllFonts() {
  if (!fontsReady) {
    fontsReady = (async () => {
      await Promise.all(FONTS_TO_LOAD.map(([f, w]) => ensureFont(f, w)))
      // corsivi
      try {
        await document.fonts.load(`italic 500 64px "Playfair Display"`)
        await document.fonts.load(`italic 700 64px "Playfair Display"`)
      } catch {
        /* ignora */
      }
    })()
  }
  return fontsReady
}

export function drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, o: Overlay, strength = 1) {
  if (o === 'none' || strength <= 0) return
  ctx.save()
  if (o === 'bottom' || o === 'top') {
    const g = o === 'bottom' ? ctx.createLinearGradient(0, h * 0.4, 0, h) : ctx.createLinearGradient(0, h * 0.6, 0, 0)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${0.72 * strength})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  } else if (o === 'dim') {
    ctx.fillStyle = `rgba(0,0,0,${0.42 * strength})`
    ctx.fillRect(0, 0, w, h)
  } else if (o === 'vignette') {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${0.65 * strength})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
  ctx.restore()
}

export interface TextOptions {
  title: string
  subtitle: string
  sizeK: number // moltiplicatore utente
  y: number
  align: Align
  color: string
}

function fontStr(weight: number, italic: boolean | undefined, px: number, family: string) {
  return `${italic ? 'italic ' : ''}${weight} ${Math.round(px)}px "${family}", sans-serif`
}

/** Disegna titolo e sottotitolo secondo il template. */
export function drawTemplateText(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: TextTemplate,
  o: TextOptions,
) {
  const margin = w * 0.08
  const maxW = w - margin * 2
  const title = t.upper ? o.title.toUpperCase() : o.title
  const sub = t.subUpper ? o.subtitle.toUpperCase() : o.subtitle

  // Dimensione titolo: parte dal template, si riduce se una parola non entra
  let px = w * t.size * o.sizeK
  ctx.font = fontStr(t.weight, t.italic, px, t.font)
  setSpacing(ctx, px * t.spacing)
  const longest = Math.max(1, ...title.split(/\s+/).map((wd) => ctx.measureText(wd).width))
  if (longest > maxW) {
    px *= maxW / longest
    ctx.font = fontStr(t.weight, t.italic, px, t.font)
    setSpacing(ctx, px * t.spacing)
  }
  const lines = title.trim() ? wrapLines(ctx, title, maxW) : []
  const lh = px * t.lineHeight

  const subPx = w * t.subSize * Math.sqrt(o.sizeK)
  ctx.font = fontStr(t.subWeight, false, subPx, t.subFont)
  setSpacing(ctx, subPx * t.subSpacing)
  const subLines = sub.trim() ? wrapLines(ctx, sub, maxW) : []
  const subLh = subPx * 1.35
  const gap = lines.length && subLines.length ? px * 0.35 : 0

  const quoteH = t.quote && lines.length ? px * 1.4 : 0
  const blockH = quoteH + lines.length * lh + gap + subLines.length * subLh
  let top = o.y * h - blockH / 2
  top = Math.max(margin * 0.8, Math.min(h - margin * 0.8 - blockH, top))

  const x = o.align === 'left' ? margin : o.align === 'right' ? w - margin : w / 2
  ctx.textAlign = o.align
  ctx.textBaseline = 'alphabetic'

  // Fascia colorata dietro le righe del titolo
  if (t.band && lines.length) {
    ctx.font = fontStr(t.weight, t.italic, px, t.font)
    setSpacing(ctx, px * t.spacing)
    ctx.fillStyle = o.color
    lines.forEach((ln, i) => {
      const lw = ctx.measureText(ln).width
      const padX = px * 0.25
      const by = top + quoteH + i * lh + lh * 0.04
      const bx = o.align === 'left' ? x - padX : o.align === 'right' ? x - lw - padX : x - lw / 2 - padX
      ctx.fillRect(bx, by, lw + padX * 2, lh * 0.98)
    })
  }

  ctx.save()
  if (t.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = px * 0.18
    ctx.shadowOffsetY = px * 0.04
  }

  if (t.quote && lines.length) {
    ctx.font = fontStr(700, false, px * 2.6, 'Playfair Display')
    setSpacing(ctx, 0)
    ctx.fillStyle = o.color
    ctx.globalAlpha = 0.9
    ctx.fillText('“', x, top + px * 1.9)
    ctx.globalAlpha = 1
  }

  ctx.font = fontStr(t.weight, t.italic, px, t.font)
  setSpacing(ctx, px * t.spacing)
  ctx.fillStyle = t.band ? pickContrast(o.color) : o.color
  lines.forEach((ln, i) => {
    ctx.fillText(ln, x, top + quoteH + i * lh + lh * 0.82)
  })

  ctx.font = fontStr(t.subWeight, false, subPx, t.subFont)
  setSpacing(ctx, subPx * t.subSpacing)
  ctx.fillStyle = t.band ? '#ffffff' : o.color
  ctx.globalAlpha = 0.92
  const subTop = top + quoteH + lines.length * lh + gap
  subLines.forEach((ln, i) => {
    // compensa lo spazio finale del letterSpacing quando centrato
    const off = o.align === 'center' ? (subPx * t.subSpacing) / 2 : 0
    ctx.fillText(ln, x + off, subTop + i * subLh + subPx)
  })
  ctx.restore()
  setSpacing(ctx, 0)
}

/** Nero o bianco a seconda della luminosità del colore. */
export function pickContrast(hex: string): string {
  const m = hex.replace('#', '')
  const n = parseInt(m.length === 3 ? m.replace(/./g, '$&$&') : m, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111111' : '#ffffff'
}

/** Piccola firma "creato con PostKit" (si può disattivare). */
export function drawBadge(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const px = Math.round(w * 0.022)
  ctx.save()
  ctx.font = `600 ${px}px "Inter", sans-serif`
  setSpacing(ctx, px * 0.08)
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = px * 0.4
  ctx.fillText('creato con PostKit', w - w * 0.04, h - w * 0.035)
  ctx.restore()
  setSpacing(ctx, 0)
}
