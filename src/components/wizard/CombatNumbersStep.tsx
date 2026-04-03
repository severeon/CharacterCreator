import type { Entity } from '../../lib/types'
import { babTable } from '../reference/babTable'

interface CombatNumbersStepProps {
  characterId: string | null
  abilities: Record<string, number>
  selectedClass: Entity | null
  selectedRace: Entity | null
  onContinue: () => void
  onBack: () => void
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

const statBox: React.CSSProperties = {
  background: 'var(--parchment-light)',
  border: '1px solid var(--gold-rule)',
  borderTop: '2px solid var(--burgundy)',
  padding: '8px 10px',
}

const statLabel: React.CSSProperties = {
  display: 'block',
  fontFamily: "'Cinzel', serif",
  fontSize: '0.6rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--ink-light)',
  marginBottom: '2px',
}

const statValue = (positive: boolean): React.CSSProperties => ({
  display: 'block',
  fontFamily: "'Cinzel', serif",
  fontSize: '1.5rem',
  fontWeight: 700,
  color: positive ? 'var(--burgundy)' : '#8B1010',
})

const statSub: React.CSSProperties = {
  display: 'block',
  fontSize: '0.6rem',
  color: 'var(--ink-light)',
  marginTop: '1px',
}

export function CombatNumbersStep({ abilities, selectedClass }: CombatNumbersStepProps) {
  const strMod = abilityModifier(abilities.strength || 10)
  const dexMod = abilityModifier(abilities.dexterity || 10)
  const conMod = abilityModifier(abilities.constitution || 10)
  const intMod = abilityModifier(abilities.intelligence || 10)
  const wisMod = abilityModifier(abilities.wisdom || 10)
  const chaMod = abilityModifier(abilities.charisma || 10)

  const classData = selectedClass?.properties ?? {}
  const hd = (classData['hd'] as number) ?? 8
  const bab = ((classData['bab'] as string) ?? 'medium').toLowerCase()
  const fortBase = (classData['fort'] as number) ?? 0
  const refBase = (classData['ref'] as number) ?? 0
  const willBase = (classData['will'] as number) ?? 0

  const currentBAB = (babTable[bab] ?? babTable.medium)[0]
  const hp = hd + conMod
  const initiative = dexMod
  const ac = 10 + dexMod
  const flatFooted = 10 + dexMod
  const touch = 10 + dexMod
  const CMB = currentBAB + strMod

  const stats = [
    { label: 'Hit Points',      value: `${hp}`,                         sub: `HD: d${hd}`,              positive: hp > 0 },
    { label: 'Base Attack',     value: `+${currentBAB}`,                sub: 'BAB',                     positive: true },
    { label: 'Initiative',      value: `${initiative >= 0 ? '+' : ''}${initiative}`, sub: 'DEX mod',   positive: initiative >= 0 },
    { label: 'Armor Class',     value: `${ac}`,                         sub: `Touch: ${touch} / Flat: ${flatFooted}`, positive: true },
    { label: 'Fortitude',       value: `+${fortBase + conMod}`,         sub: 'Base + CON',              positive: fortBase + conMod >= 0 },
    { label: 'Reflex',          value: `+${refBase + dexMod}`,          sub: 'Base + DEX',              positive: refBase + dexMod >= 0 },
    { label: 'Will',            value: `+${willBase + wisMod}`,         sub: 'Base + WIS',              positive: willBase + wisMod >= 0 },
    { label: 'Speed',           value: '30 ft',                         sub: 'Base',                    positive: true },
    { label: 'CMB',             value: `${CMB >= 0 ? '+' : ''}${CMB}`, sub: 'BAB + STR',               positive: CMB >= 0 },
    { label: 'Grapple',         value: `${CMB >= 0 ? '+' : ''}${CMB}`, sub: 'CMB',                     positive: CMB >= 0 },
  ]

  const modifiers = [
    { key: 'STR', val: strMod }, { key: 'DEX', val: dexMod }, { key: 'CON', val: conMod },
    { key: 'INT', val: intMod }, { key: 'WIS', val: wisMod }, { key: 'CHA', val: chaMod },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.875rem', color: 'var(--ink-mid)', lineHeight: 1.6 }}>
        These numbers define your combat capabilities. Review them carefully.
      </p>

      {/* Combat Numbers Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
        {stats.map(({ label, value, sub, positive }) => (
          <div key={label} style={statBox}>
            <span style={statLabel}>{label}</span>
            <span style={statValue(positive)}>{value}</span>
            <span style={statSub}>{sub}</span>
          </div>
        ))}
      </div>

      {/* Ability Modifiers Summary */}
      <div>
        <div className="dnd-section-header">Ability Modifiers</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          background: 'var(--parchment-dark)',
          border: '1px solid var(--gold-rule)',
          borderTop: 'none',
          padding: '6px 10px',
          gap: '0.25rem',
        }}>
          {modifiers.map(({ key, val }) => (
            <div key={key} style={{ textAlign: 'center' as const }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--ink-light)', display: 'block' }}>
                {key}
              </span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.85rem', fontWeight: 700, color: val >= 0 ? 'var(--burgundy)' : '#8B1010' }}>
                {val >= 0 ? '+' : ''}{val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
