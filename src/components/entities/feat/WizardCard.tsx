import type { Entity } from '../../../lib/types'
import { getPropertyString } from '../../../lib/properties'

interface Props {
  entity: Entity
  selected?: boolean
  onSelect?: (id: string) => void
}

export default function FeatWizardCard({ entity, selected = false, onSelect }: Props) {
  const name = getPropertyString(entity.properties, 'name', entity.id)
  const benefit = getPropertyString(entity.properties, 'benefit', '')

  return (
    <button
      type="button"
      onClick={() => onSelect?.(entity.id)}
      className="dnd-wizard-card"
      style={{
        background: selected ? 'var(--parchment-dark)' : 'var(--parchment-light)',
        borderTop: selected ? '3px solid var(--burgundy-light)' : '3px solid var(--burgundy)',
        boxShadow: selected
          ? '0 2px 8px rgba(107,20,20,0.18), inset 0 0 0 1px rgba(107,20,20,0.12)'
          : 'var(--shadow-parchment)',
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
      <div
        style={{
          padding: '7px 10px 5px',
          borderBottom: benefit ? '1px solid var(--border-rule)' : 'none',
          background: selected ? 'rgba(107,20,20,0.08)' : 'transparent',
        }}
      >
        <span
          className="dnd-wizard-card-title"
          style={{ color: selected ? 'var(--burgundy)' : 'var(--burgundy-dark)', fontSize: '0.88rem', lineHeight: 1.25 }}
        >
          {name}
        </span>
      </div>
      {benefit && (
        <div className="dnd-wizard-card-body">
          <p style={{
            fontSize: '0.72rem',
            color: 'var(--ink-mid)',
            fontFamily: "'Libre Baskerville', serif",
            fontStyle: 'italic',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {benefit}
          </p>
        </div>
      )}
    </button>
  )
}
