import React from 'react'

interface IncrDecrControlProps {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  disabled?: boolean
  label?: string
  sublabel?: string
}

export function IncrDecrControl({ value, min, max, step = 1, onChange, disabled, label, sublabel }: IncrDecrControlProps) {
  const atMin = min !== undefined && value <= min
  const atMax = max !== undefined && value >= max
  const btnBase: React.CSSProperties = {
    width: 22, height: 22,
    border: '1px solid var(--gold-rule)',
    background: 'var(--parchment-light)',
    color: 'var(--burgundy)',
    fontFamily: 'Cinzel, serif',
    fontSize: '0.9rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, lineHeight: 1, cursor: disabled ? 'default' : 'pointer',
  }
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {label && (
        <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--ink)', letterSpacing: '0.05em' }}>
          {label}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid var(--gold-rule)', background: 'var(--parchment-light)', borderTop: '3px solid var(--burgundy)', padding: '2px 4px' }}>
        <button
          style={{ ...btnBase, opacity: disabled || atMin ? 0.3 : 1 }}
          onClick={() => { if (!disabled && !atMin) onChange(value - step) }}
          disabled={disabled || atMin}
        >−</button>
        <span style={{ minWidth: 28, textAlign: 'center', fontFamily: 'Cinzel, serif', color: 'var(--ink)', fontSize: '0.9rem' }}>
          {value}
        </span>
        <button
          style={{ ...btnBase, opacity: disabled || atMax ? 0.3 : 1 }}
          onClick={() => { if (!disabled && !atMax) onChange(value + step) }}
          disabled={disabled || atMax}
        >+</button>
      </div>
      {sublabel && (
        <span style={{ fontSize: '0.7rem', fontStyle: 'italic', color: 'var(--ink)' }}>{sublabel}</span>
      )}
    </div>
  )
}
