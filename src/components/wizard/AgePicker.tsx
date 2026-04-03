import { IncrDecrControl } from '../primitives/IncrDecrControl'

interface AgePickerProps {
  value: number
  race: { properties: Record<string, unknown> } | null
  onChange: (age: number) => void
  unlocked?: boolean
}

function parseAgeMilestones(race: { properties: Record<string, unknown> } | null): [number, number, number, number] | null {
  if (!race) return null
  const raw = race.properties['age']
  if (!Array.isArray(raw) || raw.length < 4) return null
  const nums = raw.slice(0, 4).map(Number)
  if (nums.some(isNaN)) return null
  return nums as [number, number, number, number]
}

function getContextualLabel(age: number, milestones: [number, number, number, number] | null, normalMax: number, unlocked: boolean): string {
  if (!milestones) return ''
  const [mature, middle, old, venerable] = milestones
  if (unlocked && age > normalMax) return 'Beyond the Ages'
  if (age >= venerable) return 'Venerable'
  if (age >= old) return 'Old'
  if (age >= middle) return 'Middle Age'
  if (age >= mature) return 'Young Adult'
  return 'Child'
}

const rangeSliderStyle = `
  .age-range-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    background: var(--parchment-dark);
    border: 1px solid var(--gold-rule);
    outline: none;
    cursor: pointer;
  }
  .age-range-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--burgundy);
    cursor: pointer;
    border: 2px solid var(--gold-rule);
  }
  .age-range-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--burgundy);
    cursor: pointer;
    border: 2px solid var(--gold-rule);
  }
`

export function AgePicker({ value, race, onChange, unlocked = false }: AgePickerProps) {
  const milestones = parseAgeMilestones(race)

  // No race data: just show IncrDecrControl
  if (!milestones) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '0.62rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
          }}
        >
          Age
        </span>
        <IncrDecrControl value={value} onChange={onChange} min={0} />
      </div>
    )
  }

  const [_mature, _middle, _old, venerable] = milestones
  const normalMax = venerable + Math.ceil(venerable * 0.2)
  const sliderMax = unlocked ? 10000 : normalMax
  const contextLabel = getContextualLabel(value, milestones, normalMax, unlocked)

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value))
  }

  // Tick positions for the datalist
  const tickId = 'age-ticks'
  const milestoneValues = milestones
  const tickLabels: { val: number; name: string }[] = [
    { val: milestoneValues[0], name: 'Adult' },
    { val: milestoneValues[1], name: 'Middle' },
    { val: milestoneValues[2], name: 'Old' },
    { val: milestoneValues[3], name: 'Venerable' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{rangeSliderStyle}</style>

      {/* Title */}
      <div
        className="dnd-section-header"
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--burgundy)',
          borderBottom: '1px solid var(--burgundy)',
          paddingBottom: 4,
        }}
      >
        Age
      </div>

      {/* Large age display */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--burgundy)',
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: "'Libre Baskerville', serif",
            fontSize: '0.8rem',
            fontStyle: 'italic',
            color: 'var(--ink)',
            marginTop: 4,
            opacity: 0.8,
          }}
        >
          {contextLabel}
        </div>
      </div>

      {/* Slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <input
          type="range"
          className="age-range-slider"
          min={0}
          max={sliderMax}
          step={1}
          value={value}
          onChange={handleSliderChange}
          list={tickId}
        />

        {/* Datalist ticks */}
        <datalist id={tickId}>
          {tickLabels.map((t) => (
            <option key={t.val} value={t.val} label={t.name} />
          ))}
        </datalist>

        {/* Milestone labels under slider */}
        <div style={{ position: 'relative', height: 18, marginTop: 2 }}>
          {tickLabels.map((t) => {
            const pct = (t.val / sliderMax) * 100
            return (
              <span
                key={t.val}
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  transform: 'translateX(-50%)',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.55rem',
                  textTransform: 'uppercase',
                  color: 'var(--ink)',
                  opacity: 0.6,
                  whiteSpace: 'nowrap',
                }}
              >
                {t.name}
              </span>
            )
          })}
        </div>
      </div>

      {/* IncrDecrControl for precision */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <IncrDecrControl
          value={value}
          min={0}
          max={sliderMax}
          onChange={onChange}
          label="Precise Age"
        />
      </div>
    </div>
  )
}
