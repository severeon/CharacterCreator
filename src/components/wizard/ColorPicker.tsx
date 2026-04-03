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
      {label && <span className="dnd-field-label">{label}</span>}

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
          className="dnd-field-input"
          style={{ flex: 1, width: undefined, padding: '4px 8px' }}
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
