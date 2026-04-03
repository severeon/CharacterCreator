import type { Entity, Value } from '../../../lib/types'
import { getPropertyString, getPropertyNumber } from '../../../lib/properties'
import { isObject, ABILITY_KEYS } from '../shared'

interface Props {
  entity: Entity
  selected?: boolean
  onSelect?: (id: string) => void
}

export default function RaceWizardCard({ entity, selected = false, onSelect }: Props) {
  const name = getPropertyString(entity.properties, 'name', entity.id)
  const speed = getPropertyNumber(entity.properties, 'speed', 0)

  const physicalRaw = entity.properties.physical
  const physical = isObject(physicalRaw) ? physicalRaw : null
  const size = physical !== null ? getPropertyString(physical as Record<string, Value>, 'size', '') : ''

  const bonusesRaw = entity.properties.bonuses
  const bonuses = isObject(bonusesRaw) ? bonusesRaw : null

  const bonusParts: string[] = []
  if (bonuses !== null) {
    for (const key of ABILITY_KEYS) {
      const val = bonuses[key]
      if (typeof val === 'number' && val !== 0) {
        const sign = val > 0 ? '+' : ''
        bonusParts.push(`${sign}${val} ${key.toUpperCase()}`)
      }
    }
  }

  const bonusSummary = bonusParts.join('/')

  return (
    <button
      type="button"
      onClick={() => onSelect?.(entity.id)}
      style={{
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        padding: 0,
        background: selected ? 'var(--parchment-dark)' : 'var(--parchment-light)',
        border: '1px solid var(--gold-rule)',
        borderTop: selected ? '3px solid var(--burgundy-light)' : '3px solid var(--burgundy)',
        boxShadow: selected
          ? '0 2px 8px rgba(107,20,20,0.18), inset 0 0 0 1px rgba(107,20,20,0.12)'
          : 'var(--shadow-parchment)',
        transform: selected ? 'none' : undefined,
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.12s',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (!selected) {
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-card)'
        }
      }}
      onMouseLeave={e => {
        if (!selected) {
          (e.currentTarget as HTMLButtonElement).style.transform = ''
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-parchment)'
        }
      }}
    >
      <div style={{
        padding: '7px 10px 5px',
        minHeight: '2.6rem',
        borderBottom: '1px solid var(--border-rule)',
        background: selected ? 'rgba(107,20,20,0.08)' : 'transparent',
        display: 'flex',
        alignItems: 'flex-start',
      }}>
        <span style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '0.82rem',
          fontWeight: 600,
          color: selected ? 'var(--burgundy)' : 'var(--burgundy-dark)',
          display: 'block',
          lineHeight: 1.3,
        }}>
          {name}
        </span>
      </div>
      <div style={{ padding: '5px 10px 8px' }}>
        {(size || speed > 0) && (
          <p style={{ fontSize: '0.72rem', color: 'var(--ink-light)', marginBottom: '2px', fontStyle: 'italic' }}>
            {[size, speed > 0 ? `${speed} ft` : ''].filter(Boolean).join(' · ')}
          </p>
        )}
        {bonusSummary && (
          <p style={{ fontSize: '0.7rem', color: 'var(--ink-mid)', fontFamily: "'Libre Baskerville', serif" }}>
            {bonusSummary}
          </p>
        )}
      </div>
    </button>
  )
}
