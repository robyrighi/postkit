import { useRef, type ReactNode } from 'react'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="field">
      <div className="field-label">
        <span>{label}</span>
        {hint && <span className="muted small">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  const { label, value, min, max, step = 0.01, onChange, format } = props
  return (
    <Field label={label} hint={format ? format(value) : undefined}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </Field>
  )
}

export function Segmented<T extends string | number>(props: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="segmented" role="radiogroup">
      {props.options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={props.value === o.value}
          className={props.value === o.value ? 'on' : ''}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function FilePick({
  onFile,
  label = 'Scegli una foto',
  compact = false,
}: {
  onFile: (f: File) => void
  label?: string
  compact?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div
      className={'drop' + (compact ? ' compact' : '')}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const f = e.dataTransfer.files?.[0]
        if (f && f.type.startsWith('image/')) onFile(f)
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && ref.current?.click()}
    >
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
      <span className="drop-icon">🖼️</span>
      <span>{label}</span>
      {!compact && <span className="muted small">Tocca per scegliere dalla galleria, o trascina qui</span>}
    </div>
  )
}

export function ColorRow({ value, onChange, colors }: { value: string; onChange: (c: string) => void; colors: string[] }) {
  return (
    <div className="colors">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          className={'swatch' + (c.toLowerCase() === value.toLowerCase() ? ' on' : '')}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={`Colore ${c}`}
        />
      ))}
      <label className="swatch custom" aria-label="Colore personalizzato">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  )
}
