import type { Entity } from '../../lib/types'
import RaceWizardCard from '../entities/race/WizardCard'
import ClassWizardCard from '../entities/class/WizardCard'
import FeatWizardCard from '../entities/feat/WizardCard'

interface EntitySelectorProps {
  config: {
    entity_type: string
    display?: 'card-grid' | 'filterable-list'
    filter_eligible?: boolean
  }
  entities: Entity[]
  selectedIds: string[]
  onSelect: (entity: Entity) => void
}

function FallbackCard({ entity, selected, onSelect }: { entity: Entity; selected: boolean; onSelect: () => void }) {
  const name = typeof entity.properties['name'] === 'string' ? entity.properties['name'] : entity.id
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        padding: '8px 10px',
        background: selected ? 'var(--parchment-dark)' : 'var(--parchment-light)',
        border: '1px solid var(--gold-rule)',
        borderTop: selected ? '3px solid var(--burgundy-light)' : '3px solid var(--burgundy)',
        boxShadow: 'var(--shadow-parchment)',
        transition: 'border-color 0.15s, transform 0.12s',
        fontFamily: "'Cinzel', serif",
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--burgundy-dark)',
      }}
    >
      {name}
    </button>
  )
}

export function EntitySelector({ config, entities, selectedIds, onSelect }: EntitySelectorProps) {
  const isFilterableList = config.display === 'filterable-list'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isFilterableList ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: '0.6rem',
      maxHeight: isFilterableList ? '24rem' : undefined,
      overflowY: isFilterableList ? 'auto' : undefined,
      paddingTop: '3px', // prevent top border clipping
    }}>
      {entities.map((entity) => {
        const selected = selectedIds.includes(entity.id)
        const onSelectEntity = () => onSelect(entity)

        if (config.entity_type === 'template.race') {
          return (
            <RaceWizardCard
              key={entity.id}
              entity={entity}
              selected={selected}
              onSelect={onSelectEntity}
            />
          )
        }
        if (config.entity_type === 'template.class') {
          return (
            <ClassWizardCard
              key={entity.id}
              entity={entity}
              selected={selected}
              onSelect={onSelectEntity}
            />
          )
        }
        if (config.entity_type === 'rule.feat') {
          return (
            <FeatWizardCard
              key={entity.id}
              entity={entity}
              selected={selected}
              onSelect={onSelectEntity}
            />
          )
        }
        return (
          <FallbackCard
            key={entity.id}
            entity={entity}
            selected={selected}
            onSelect={onSelectEntity}
          />
        )
      })}
      {entities.length === 0 && (
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: 'var(--ink-light)', fontSize: '0.85rem', gridColumn: '1/-1' }}>
          No options available.
        </p>
      )}
    </div>
  )
}
