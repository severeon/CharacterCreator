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

// Colored band definitions — progress from pale parchment through gold to deep burgundy
const BAND_COLORS = ['#DDD0A8', '#C9A84C', '#B07838', '#8B4420', '#6B1414']

const sliderThumbCss = `
  .age-picker-range {
    -webkit-appearance: none;
    appearance: none;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    cursor: pointer;
    margin: 0;
    padding: 0;
  }
  .age-picker-range::-webkit-slider-runnable-track {
    background: transparent;
    height: 100%;
  }
  .age-picker-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--parchment-light);
    border: 2px solid var(--burgundy);
    box-shadow: 0 0 0 1px var(--gold-rule), 0 2px 4px rgba(28,16,8,0.35);
    cursor: pointer;
    margin-top: -7px;
  }
  .age-picker-range::-moz-range-track {
    background: transparent;
    height: 100%;
  }
  .age-picker-range::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--parchment-light);
    border: 2px solid var(--burgundy);
    box-shadow: 0 0 0 1px var(--gold-rule), 0 2px 4px rgba(28,16,8,0.35);
    cursor: pointer;
  }
  .age-picker-range:focus {
    outline: none;
  }
  .age-picker-range:focus::-webkit-slider-thumb {
    box-shadow: 0 0 0 2px var(--burgundy), 0 2px 4px rgba(28,16,8,0.35);
  }
`

export function AgePicker({ value, race, onChange, unlocked = false }: AgePickerProps) {
  const milestones = parseAgeMilestones(race)

  // No race data: just show IncrDecrControl
  if (!milestones) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <IncrDecrControl value={value} onChange={onChange} min={0} />
      </div>
    )
  }

  const [mature, middle, old, venerable] = milestones
  const normalMax = venerable + Math.ceil(venerable * 0.2)
  const sliderMax = unlocked ? 10000 : normalMax
  const contextLabel = getContextualLabel(value, milestones, normalMax, unlocked)

  // Five bands: Child | Young Adult | Middle Age | Old | Venerable+
  const bandDefs = [
    { label: 'Child',       start: 0,        end: mature,  color: BAND_COLORS[0] },
    { label: 'Young Adult', start: mature,   end: middle,  color: BAND_COLORS[1] },
    { label: 'Middle Age',  start: middle,   end: old,     color: BAND_COLORS[2] },
    { label: 'Old',         start: old,      end: venerable, color: BAND_COLORS[3] },
    { label: 'Venerable',   start: venerable, end: sliderMax, color: BAND_COLORS[4] },
  ]

  // Which band is the current age in?
  const activeBandIdx = bandDefs.findIndex((b) => value >= b.start && value < b.end)
  const effectiveActiveBand = activeBandIdx === -1 ? bandDefs.length - 1 : activeBandIdx

  // Milestone tick positions as percentages
  const ticks = [
    { val: mature,    label: 'Adult' },
    { val: middle,    label: 'Middle' },
    { val: old,       label: 'Old' },
    { val: venerable, label: 'Venerable' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{sliderThumbCss}</style>

      {/* Large age + label */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: '2rem', fontWeight: 700, color: 'var(--burgundy)', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--ink)', marginTop: 4, opacity: 0.8, minHeight: '1.1em' }}>
          {contextLabel}
        </div>
      </div>

      {/* Slider track + bands */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Band track with range input overlaid */}
        <div style={{ position: 'relative', height: 6, borderRadius: 3, overflow: 'hidden', border: '1px solid var(--gold-rule)' }}>

          {/* Colored segments */}
          <div style={{ display: 'flex', height: '100%' }}>
            {bandDefs.map((band, i) => {
              const widthPct = ((band.end - band.start) / sliderMax) * 100
              const isActive = i === effectiveActiveBand
              return (
                <div
                  key={band.label}
                  style={{
                    width: `${widthPct}%`,
                    height: '100%',
                    background: band.color,
                    opacity: isActive ? 1 : 0.55,
                    transition: 'opacity 0.15s',
                    flexShrink: 0,
                  }}
                />
              )
            })}
          </div>

          {/* Milestone dividers */}
          {ticks.map((t) => {
            const pct = (t.val / sliderMax) * 100
            return (
              <div
                key={t.val}
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: `${pct}%`,
                  width: 1,
                  background: 'rgba(28,16,8,0.35)',
                  pointerEvents: 'none',
                }}
              />
            )
          })}

          {/* Range input — transparent track, styled thumb only */}
          <input
            type="range"
            className="age-picker-range"
            min={0}
            max={sliderMax}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>

        {/* Milestone labels */}
        <div style={{ position: 'relative', height: 20, marginTop: 3 }}>
          {ticks.map((t) => {
            const pct = (t.val / sliderMax) * 100
            return (
              <div
                key={t.val}
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <div style={{ width: 1, height: 4, background: 'var(--gold-rule)' }} />
                <span style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.52rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--ink)',
                  opacity: 0.65,
                  whiteSpace: 'nowrap',
                }}>
                  {t.label} {t.val}
                </span>
              </div>
            )
          })}
        </div>

      </div>

      {/* Band legend */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 2 }}>
        {bandDefs.map((band, i) => (
          <div
            key={band.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: i === effectiveActiveBand ? 1 : 0.5,
              transition: 'opacity 0.15s',
            }}
          >
            <div style={{
              width: 10,
              height: 10,
              background: band.color,
              border: i === effectiveActiveBand ? '1px solid var(--burgundy)' : '1px solid var(--gold-rule)',
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.58rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--ink)',
              fontWeight: i === effectiveActiveBand ? 700 : 400,
            }}>
              {band.label}
            </span>
          </div>
        ))}
      </div>

      {/* IncrDecrControl for precision */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
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
