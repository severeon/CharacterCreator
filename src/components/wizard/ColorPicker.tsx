export type { ColorSwatch } from '../../lib/dnd35/colorPalettes'
export { EYE_COLORS, HAIR_COLORS, SKIN_COLORS } from '../../lib/dnd35/colorPalettes'

import type { ColorSwatch } from '../../lib/dnd35/colorPalettes'

interface ColorPickerProps {
  palette: ColorSwatch[]
  value: string
  onChange: (label: string) => void
  placeholder?: string
  label?: string
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
  flex: 1,
  background: 'var(--parchment-dark)',
  border: '1px solid var(--gold-rule)',
  padding: '4px 8px',
  fontFamily: "'Libre Baskerville', serif",
  fontSize: '0.85rem',
  color: 'var(--ink)',
  outline: 'none',
  lineHeight: 1.5,
  boxSizing: 'border-box' as const,
}

export function ColorPicker({ palette, value, onChange, placeholder, label }: ColorPickerProps) {
  const selectedSwatch = palette.find((s) => s.label === value) ?? null

  const handleSwatchClick = (swatch: ColorSwatch) => {
    onChange(swatch.label)
  }

  const handleTextChange = (text: string) => {
    onChange(text)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <span style={labelStyle}>{label}</span>}

      {/* Swatch row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {palette.map((swatch) => {
          const isSelected = swatch.label === value
          return (
            <button
              key={swatch.label}
              title={swatch.label}
              onClick={() => handleSwatchClick(swatch)}
              style={{
                width: 26,
                height: 26,
                background: swatch.hex,
                border: isSelected ? '2px solid var(--burgundy)' : '1px solid var(--gold-rule)',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                outline: isSelected ? '1px solid var(--parchment-light)' : 'none',
                outlineOffset: -3,
              }}
              aria-label={swatch.label}
              aria-pressed={isSelected}
            />
          )
        })}
      </div>

      {/* Text input + preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="text"
          value={value}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={placeholder ?? 'Type a color…'}
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = 'var(--burgundy)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--gold-rule)')}
        />
        {/* Preview square */}
        <div
          style={{
            width: 18,
            height: 18,
            background: selectedSwatch ? selectedSwatch.hex : '#9e9e9e',
            border: '1px solid var(--gold-rule)',
            flexShrink: 0,
          }}
          title={selectedSwatch ? selectedSwatch.label : 'Custom color'}
        />
      </div>
    </div>
  )
}
