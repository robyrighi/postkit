// Icone su misura per il menu (tratto unico, colore dal CSS).
interface P {
  size?: number
}
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

/** Sport: cronometro con battito */
export function IconSport({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M10 2.5h4M12 2.5v2.6" />
      <path d="M18.3 6.4l1.3-1.3" />
      <circle cx="12" cy="13.6" r="8" />
      <path d="M6.6 13.8h2.6l1.4-3 2.4 6 1.5-3h2.9" className="accent" />
    </svg>
  )
}

/** Testo: T tipografica con cursore e scintilla */
export function IconText({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <path d="M4 6.5V4.5h11v2" />
      <path d="M9.5 4.5v15M7.5 19.5h4" />
      <path d="M17.5 11v9M16 11h3M16 20h3" className="accent" />
      <path d="M19.5 2.8l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" className="accent fill" />
    </svg>
  )
}

/** Panoramica: montagne divise in tre slide */
export function IconPanorama({ size = 22 }: P) {
  return (
    <svg {...base(size)}>
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2.5 16.5l5-5.5 3.5 3.5 3-3 7.5 6.5" />
      <path d="M8.7 5v14M15.3 5v14" strokeDasharray="1.6 2.2" className="accent" />
      <circle cx="17.5" cy="8.6" r="1.2" />
    </svg>
  )
}
