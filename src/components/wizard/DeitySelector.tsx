import { DEITY_SUGGESTIONS } from '../../lib/dnd35/deities'

interface DeitySelectorProps {
  value: string
  onChange: (deity: string) => void
}

export function DeitySelector({ value, onChange }: DeitySelectorProps) {
  const listId = 'deity-suggestions'

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label htmlFor="deity-input" className="dnd-field-label">Deity</label>
      <input
        id="deity-input"
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="dnd-field-input"
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
