import type { Entity } from '../../lib/types'

interface RacialClassFeaturesStepProps {
  selectedRace: Entity | null
  selectedClass: Entity | null
  onContinue: () => void
  onBack: () => void
}

const featureBlockStyle: React.CSSProperties = {
  background: 'var(--parchment-light)',
  border: '1px solid var(--gold-rule)',
  borderTop: '3px solid var(--burgundy)',
  marginBottom: '0.75rem',
  overflow: 'hidden',
}

const featureBodyStyle: React.CSSProperties = {
  padding: '8px 12px 10px',
  fontFamily: "'Libre Baskerville', serif",
  fontSize: '0.82rem',
  color: 'var(--ink-mid)',
  lineHeight: 1.6,
}

export function RacialClassFeaturesStep({ selectedRace, selectedClass }: RacialClassFeaturesStepProps) {
  const raceName = (selectedRace?.properties['name'] as string) ?? 'Unknown Race'
  const className = (selectedClass?.properties['name'] as string) ?? 'Unknown Class'
  const raceTraits = selectedRace?.properties['traits'] as string[] | undefined
  const classFeatures = selectedClass?.properties['features'] as string[] | undefined
  const ecl = selectedRace?.properties['ecl']
  const hd = selectedClass?.properties['hd']
  const bab = selectedClass?.properties['bab']
  const fort = selectedClass?.properties['fort']
  const ref = selectedClass?.properties['ref']
  const will = selectedClass?.properties['will']

  const statRow = (label: string, value: string) => (
    <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid rgba(155,120,50,0.15)', padding: '3px 0', marginTop: '2px' }}>
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--ink-mid)', minWidth: '8rem' }}>
        {label}
      </span>
      <span style={{ color: 'var(--ink)' }}>{value}</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      {/* Racial Traits */}
      <div style={featureBlockStyle}>
        <div className="dnd-section-header">Racial Traits — {raceName}</div>
        <div style={featureBodyStyle}>
          {raceTraits && raceTraits.length > 0 ? (
            <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
              {raceTraits.map((trait, i) => (
                <li key={i} style={{ marginBottom: '2px', color: 'var(--ink)' }}>{trait}</li>
              ))}
            </ul>
          ) : (
            <p style={{ fontStyle: 'italic', color: 'var(--ink-light)' }}>No traits listed.</p>
          )}
          {ecl !== undefined && statRow('Effective Character Level', String(ecl))}
        </div>
      </div>

      {/* Class Features */}
      <div style={featureBlockStyle}>
        <div className="dnd-section-header">Class Features — {className}</div>
        <div style={featureBodyStyle}>
          {classFeatures && classFeatures.length > 0 ? (
            <ul style={{ paddingLeft: '1.2rem', margin: 0, marginBottom: '6px' }}>
              {classFeatures.map((feature, i) => (
                <li key={i} style={{ marginBottom: '2px', color: 'var(--ink)' }}>{feature}</li>
              ))}
            </ul>
          ) : (
            <p style={{ fontStyle: 'italic', color: 'var(--ink-light)', marginBottom: '6px' }}>No features listed.</p>
          )}
          {hd !== undefined && statRow('Hit Die', `d${String(hd)}`)}
          {bab !== undefined && statRow('Base Attack Bonus', String(bab))}
          {fort !== undefined && statRow('Fortitude Save', `+${String(fort)}`)}
          {ref !== undefined && statRow('Reflex Save', `+${String(ref)}`)}
          {will !== undefined && statRow('Will Save', `+${String(will)}`)}
        </div>
      </div>
    </div>
  )
}
