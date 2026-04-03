import { DEITY_SUGGESTIONS } from '../../lib/dnd35/deities'

interface DeitySelectorProps {
  value: string
  onChange: (deity: string) => void
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'Cinzel', serif",
  fontSize: '0.62rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ink)',
  marginBottom: '4px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--parchment-dark)',
  border: '1px solid var(--gold-rule)',
  padding: '6px 10px',
  fontFamily: "'Libre Baskerville', serif",
  fontSize: '0.85rem',
  color: 'var(--ink)',
  outline: 'none',
  lineHeight: 1.5,
  boxSizing: 'border-box',
}

export function DeitySelector({ value, onChange }: DeitySelectorProps) {
  const listId = 'deity-suggestions'

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label htmlFor="deity-input" style={labelStyle}>Deity</label>
      <input
        id="deity-input"
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
        placeholder="Choose or type a deity…"
        autoComplete="off"
        onFocus={(e) => (e.target.style.borderColor = 'var(--burgundy)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--gold-rule)')}
      />
      <datalist id={listId}>
        {DEITY_SUGGESTIONS.map((deity) => (
          <option key={deity} value={deity} />
        ))}
      </datalist>
      <span
        style={{
          marginTop: 4,
          fontSize: '0.72rem',
          fontStyle: 'italic',
          color: 'var(--ink)',
          opacity: 0.7,
        }}
      >
        Free text allowed — deity content pack coming soon.
      </span>
    </div>
  )
}
