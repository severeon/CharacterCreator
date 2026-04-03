interface TextFormProps {
  config: { fields: string[] }
  values: Record<string, string>
  onChange: (field: string, value: string) => void
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Character Name',
  player_name: 'Player Name',
  alignment: 'Alignment',
  deity: 'Deity',
  height: 'Height',
  weight: 'Weight',
  age: 'Age',
  eyes: 'Eye Color',
  hair: 'Hair Color',
  skin: 'Skin Color',
  appearance: 'Appearance',
  background: 'Background',
  notes: 'Notes',
}

export function TextForm({ config, values, onChange }: TextFormProps) {
  const isWide = (f: string) => f === 'appearance' || f === 'background' || f === 'notes'
  const shortFields = config.fields.filter(f => !isWide(f))
  const longFields = config.fields.filter(f => isWide(f))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Short fields in a 2-column grid */}
      {shortFields.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
          {shortFields.map((field) => (
            <div key={field}>
              <label className="dnd-field-label" style={{ color: 'var(--ink-mid)' }}>{FIELD_LABELS[field] ?? field}</label>
              <input
                type="text"
                value={values[field] ?? ''}
                onChange={(e) => onChange(field, e.target.value)}
                className="dnd-field-input"
                onFocus={e => (e.target.style.borderColor = 'var(--burgundy)')}
                onBlur={e => (e.target.style.borderColor = 'var(--gold-rule)')}
              />
            </div>
          ))}
        </div>
      )}

      {/* Long fields full-width */}
      {longFields.map((field) => (
        <div key={field}>
          <label className="dnd-field-label" style={{ color: 'var(--ink-mid)' }}>{FIELD_LABELS[field] ?? field}</label>
          <textarea
            value={values[field] ?? ''}
            onChange={(e) => onChange(field, e.target.value)}
            rows={3}
            className="dnd-field-input"
            style={{ resize: 'vertical' as const }}
            onFocus={e => (e.target.style.borderColor = 'var(--burgundy)')}
            onBlur={e => (e.target.style.borderColor = 'var(--gold-rule)')}
          />
        </div>
      ))}
    </div>
  )
}
