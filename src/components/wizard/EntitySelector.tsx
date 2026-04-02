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
      className={`p-4 border rounded-lg text-left transition-colors ${
        selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400'
      }`}
    >
      <span className="font-medium">{name}</span>
    </button>
  )
}

export function EntitySelector({ config, entities, selectedIds, onSelect }: EntitySelectorProps) {
  const gridClass = config.display === 'filterable-list'
    ? 'grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto'
    : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'

  return (
    <div className={gridClass}>
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
        <p className="text-gray-500 text-sm col-span-full">No options available.</p>
      )}
    </div>
  )
}
