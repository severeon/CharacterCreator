import type { Entity } from '../../lib/types'
import { babTable } from '../reference/babTable'

interface AssignAbilitiesStepProps {
  abilities: Record<string, number>
  abilityMethod: 'manual' | 'array' | 'roll' | 'pointbuy'
  pointBuyRemaining: number
  selectedClass: Entity | null
  onRollAbilities: () => void
  onStandardArray: () => void
  onPointBuy: () => void
  onManualEntry: () => void
  onAbilityPointBuy: (ability: string, delta: number) => void
  onAbilityManualChange: (ability: string, value: number) => void
  onAssignAbilities: () => void
  onBack: () => void
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

function MethodButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? 'var(--burgundy)' : 'var(--parchment-light)',
        border: `1px solid ${active ? 'var(--burgundy-dark)' : 'var(--gold-rule)'}`,
        fontFamily: "'Cinzel', serif",
        fontSize: '0.65rem',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: active ? 'var(--parchment-light)' : 'var(--ink-mid)',
        padding: '6px 14px',
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  )
}

export function AssignAbilitiesStep({
  abilities,
  abilityMethod,
  pointBuyRemaining,
  selectedClass,
  onRollAbilities,
  onStandardArray,
  onPointBuy,
  onManualEntry,
  onAbilityPointBuy,
  onAbilityManualChange,
}: AssignAbilitiesStepProps) {
  const conMod = abilityModifier(abilities.constitution || 10)
  const dexMod = abilityModifier(abilities.dexterity || 10)
  const classData = selectedClass?.properties

  const hd = classData ? (classData['hd'] as number) ?? 8 : 8
  const bab = classData ? ((classData['bab'] as string) ?? 'medium') : 'medium'
  const fortBase = classData ? ((classData['fort'] as number) ?? 0) : 0
  const refBase = classData ? ((classData['ref'] as number) ?? 0) : 0
  const willBase = classData ? ((classData['will'] as number) ?? 0) : 0

  const babProgression = babTable[bab] || babTable['medium']
  const currentBAB = babProgression[0]

  const hp = hd + conMod
  const initiative = dexMod
  const ac = 10 + dexMod
  const flatFooted = 10 + dexMod
  const touch = 10 + dexMod

  const statBoxStyle = {
    background: 'var(--parchment-light)',
    border: '1px solid var(--gold-rule)',
    borderTop: '2px solid var(--burgundy)',
    padding: '8px 10px',
  }

  const statLabelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.6rem',
    fontFamily: "'Cinzel', serif",
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--ink-light)',
    marginBottom: '2px',
  }

  const statValueStyle = (positive: boolean): React.CSSProperties => ({
    display: 'block',
    fontSize: '1.4rem',
    fontWeight: 700,
    fontFamily: "'Cinzel', serif",
    color: positive ? 'var(--burgundy)' : '#8B1010',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Method Selection Buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        <MethodButton active={abilityMethod === 'roll'} onClick={onRollAbilities}>Roll 4d6 (×6)</MethodButton>
        <MethodButton active={abilityMethod === 'array'} onClick={onStandardArray}>Standard Array</MethodButton>
        <MethodButton active={abilityMethod === 'pointbuy'} onClick={onPointBuy}>
          Point Buy ({pointBuyRemaining} pts)
        </MethodButton>
        <MethodButton active={abilityMethod === 'manual'} onClick={onManualEntry}>Manual</MethodButton>
      </div>

      {/* Point Buy remaining info */}
      {abilityMethod === 'pointbuy' && (
        <div style={{
          background: 'rgba(155, 120, 50, 0.08)',
          border: '1px solid var(--gold-rule)',
          borderLeft: '3px solid var(--burgundy)',
          padding: '7px 12px',
          fontSize: '0.78rem',
          fontFamily: "'Libre Baskerville', serif",
          color: 'var(--ink-mid)',
        }}>
          Costs: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9, 16=12, 17=15, 18=19
          {' · '}
          <strong style={{ color: 'var(--burgundy)' }}>{pointBuyRemaining}</strong> points remaining
        </div>
      )}

      {/* Ability Score Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        {Object.entries(abilities).map(([ability, value]) => {
          const mod = abilityModifier(value)
          return (
            <div key={ability} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '7px 10px',
              background: 'var(--parchment-light)',
              border: '1px solid var(--gold-rule)',
              borderTop: '2px solid var(--burgundy)',
            }}>
              <span style={{
                flex: 1,
                fontFamily: "'Cinzel', serif",
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: 'var(--ink-mid)',
                textTransform: 'capitalize' as const,
              }}>
                {ability}
              </span>
              {abilityMethod === 'pointbuy' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => onAbilityPointBuy(ability, -1)}
                    disabled={value <= 8}
                    style={{
                      width: '22px', height: '22px',
                      background: 'var(--parchment-dark)',
                      border: '1px solid var(--gold-rule)',
                      fontFamily: "'Cinzel', serif",
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--ink-mid)',
                      cursor: 'pointer',
                      opacity: value <= 8 ? 0.3 : 1,
                      lineHeight: 1,
                    }}
                  >−</button>
                  <span style={{ width: '28px', textAlign: 'center', fontWeight: 700, fontFamily: "'Cinzel', serif", fontSize: '0.9rem' }}>{value}</span>
                  <button
                    onClick={() => onAbilityPointBuy(ability, 1)}
                    disabled={value >= 18 || pointBuyRemaining <= 0}
                    style={{
                      width: '22px', height: '22px',
                      background: 'var(--parchment-dark)',
                      border: '1px solid var(--gold-rule)',
                      fontFamily: "'Cinzel', serif",
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--ink-mid)',
                      cursor: 'pointer',
                      opacity: (value >= 18 || pointBuyRemaining <= 0) ? 0.3 : 1,
                      lineHeight: 1,
                    }}
                  >+</button>
                </div>
              ) : (
                <input
                  type="number"
                  value={value}
                  onChange={(e) => {
                    const newVal = parseInt(e.target.value) || 10
                    onAbilityManualChange(ability, Math.max(1, Math.min(20, newVal)))
                  }}
                  min={1}
                  max={20}
                  style={{
                    width: '52px',
                    padding: '3px 6px',
                    background: 'var(--parchment-dark)',
                    border: '1px solid var(--gold-rule)',
                    fontFamily: "'Cinzel', serif",
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: 'var(--ink)',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
              )}
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                fontFamily: "'Cinzel', serif",
                color: mod >= 0 ? 'var(--burgundy)' : '#8B1010',
                minWidth: '2rem',
                textAlign: 'right',
              }}>
                {mod >= 0 ? '+' : ''}{mod}
              </span>
            </div>
          )
        })}
      </div>

      {/* Derived Stats Preview */}
      <div>
        <div className="dnd-section-header">Derived Statistics (Preview)</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.4rem',
          padding: '10px',
          background: 'var(--parchment-dark)',
          border: '1px solid var(--gold-rule)',
          borderTop: 'none',
        }}>
          {[
            { label: 'Hit Points', value: `${hp}`, sub: `HD: d${hd}`, positive: hp > 0 },
            { label: 'Base Attack', value: `+${currentBAB}`, positive: true },
            { label: 'Initiative', value: `${initiative >= 0 ? '+' : ''}${initiative}`, positive: initiative >= 0 },
            { label: 'Armor Class', value: `${ac}`, sub: `Touch: ${touch} / Flat: ${flatFooted}`, positive: true },
            { label: 'Fortitude', value: `+${fortBase + conMod}`, positive: fortBase + conMod >= 0 },
            { label: 'Reflex', value: `+${refBase + dexMod}`, positive: refBase + dexMod >= 0 },
            { label: 'Will', value: `+${willBase + abilityModifier(abilities.wisdom || 10)}`, positive: willBase + abilityModifier(abilities.wisdom || 10) >= 0 },
            { label: 'Speed', value: '30 ft', positive: true },
          ].map(({ label, value, sub, positive }) => (
            <div key={label} style={statBoxStyle}>
              <span style={statLabelStyle}>{label}</span>
              <span style={statValueStyle(positive)}>{value}</span>
              {sub && <span style={{ display: 'block', fontSize: '0.6rem', color: 'var(--ink-light)', marginTop: '1px' }}>{sub}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
