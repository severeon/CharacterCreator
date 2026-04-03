import type { Entity } from '../../lib/types'

interface EquipmentStepProps {
  startingGold: number
  selectedClass: Entity | null
  selectedRace: Entity | null
  onContinue: () => void
  onBack: () => void
}

const classGoldTable: Record<string, number> = {
  barbarian: 86,
  bard: 90,
  cleric: 97,
  druid: 82,
  fighter: 106,
  monk: 82,
  paladin: 130,
  ranger: 106,
  rogue: 100,
  sorcerer: 70,
  wizard: 70,
}


export function EquipmentStep({ startingGold, selectedClass }: EquipmentStepProps) {
  const classId = selectedClass?.id?.toLowerCase() || ''
  const gold = classGoldTable[classId] ?? startingGold
  const className = (selectedClass?.properties['name'] as string) ?? 'Unknown'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.875rem', color: 'var(--ink-mid)', lineHeight: 1.6 }}>
        Purchase equipment using your starting gold. Choose wisely — your equipment can mean the difference between life and death.
      </p>

      {/* Starting Gold */}
      <div style={{
        background: 'rgba(155, 120, 50, 0.1)',
        border: '1px solid var(--gold-rule)',
        borderLeft: '3px solid var(--gold)',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.5rem',
      }}>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>
          {gold} gp
        </span>
        <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '0.78rem', color: 'var(--ink-light)' }}>
          starting gold · {className}
        </span>
      </div>

      {/* Equipment Categories */}
      {['Weapons', 'Armor', 'Tools & Gear'].map(cat => (
        <div key={cat} className="dnd-stat-box" style={{ overflow: 'hidden', marginBottom: '0.5rem' }}>
          <div className="dnd-section-header">{cat}</div>
          <p style={{ padding: '7px 12px', fontFamily: "'IM Fell English', Georgia, serif", fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--ink-light)' }}>
            {cat === 'Weapons' && 'Weapons, ammunition, and ranged weapons coming soon.'}
            {cat === 'Armor' && 'Armor and shields coming soon.'}
            {cat === 'Tools & Gear' && 'Adventuring gear, tools, and miscellaneous items coming soon.'}
          </p>
        </div>
      ))}

      {/* Placeholder notice */}
      <div className="dnd-note-box" style={{ fontSize: '0.8rem', color: 'var(--ink-light)', fontStyle: 'italic', textAlign: 'center', padding: '10px 14px' }}>
        Full equipment selection with item categories, prices, and shopping cart functionality coming soon.
      </div>
    </div>
  )
}
