// Logo PeakKit: monogramma PK dentro gli angoli di un mirino fotografico.
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
      <defs>
        <linearGradient id="pk-o" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5a8a" />
          <stop offset="0.55" stopColor="#ff7a2f" />
          <stop offset="1" stopColor="#ffb347" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#pk-o)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15V8a4 4 0 0 1 4-4h7" />
        <path d="M49 4h7a4 4 0 0 1 4 4v7" />
        <path d="M60 49v7a4 4 0 0 1-4 4h-7" />
        <path d="M15 60H8a4 4 0 0 1-4-4v-7" />
      </g>
      <path fill="#ffffff" fillRule="evenodd" d="M9 16h12.5a10 10 0 0 1 0 20H16v12H9zM16 22.5v7h5.5a3.5 3.5 0 0 0 0-7z" />
      <path fill="url(#pk-o)" d="M33.5 16h7v12.2L49.3 16h8.4L46.9 30.3 58.5 48h-8.3l-8.1-12.7-1.6 2.1V48h-7z" />
    </svg>
  )
}
