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

export function IncrDecrControl({
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
  label,
  sublabel,
}: IncrDecrControlProps) {
  const canDecrement = !disabled && (min === undefined || value - step >= min)
  const canIncrement = !disabled && (max === undefined || value + step <= max)

  const btnBase: React.CSSProperties = {
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--parchment-light)',
    border: '1px solid var(--gold-rule)',
    borderRadius: '2px',
    fontFamily: "'Libre Baskerville', serif",
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--burgundy)',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
    transition: 'opacity 0.15s',
    flexShrink: 0,
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      {label && (
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '0.62rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
            marginBottom: '2px',
          }}
        >
          {label}
        </span>
      )}

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px',
          background: 'var(--parchment-light)',
          border: '1px solid var(--gold-rule)',
          borderTop: '3px solid var(--burgundy)',
          borderRadius: '3px',
          padding: '2px',
        }}
      >
        <button
          type="button"
          onClick={() => canDecrement && onChange(value - step)}
          disabled={!canDecrement}
          style={{
            ...btnBase,
            opacity: canDecrement ? 1 : 0.3,
            cursor: canDecrement ? 'pointer' : 'not-allowed',
          }}
          aria-label="Decrement"
        >
          −
        </button>

        <span
          style={{
            minWidth: '2rem',
            textAlign: 'center',
            fontFamily: "'Cinzel', serif",
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--ink)',
            padding: '0 4px',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {value}
        </span>

        <button
          type="button"
          onClick={() => canIncrement && onChange(value + step)}
          disabled={!canIncrement}
          style={{
            ...btnBase,
            opacity: canIncrement ? 1 : 0.3,
            cursor: canIncrement ? 'pointer' : 'not-allowed',
          }}
          aria-label="Increment"
        >
          +
        </button>
      </div>

      {sublabel && (
        <span
          style={{
            fontFamily: "'Libre Baskerville', serif",
            fontSize: '0.7rem',
            fontStyle: 'italic',
            color: 'var(--ink)',
            marginTop: '2px',
          }}
        >
          {sublabel}
        </span>
      )}
    </div>
  )
}

export default IncrDecrControl
