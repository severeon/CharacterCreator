import type { Entity } from '../../../lib/types'
import { getPropertyString } from '../../../lib/properties'

interface Props {
  entity: Entity
}

export default function SkillCard({ entity }: Props) {
  const name = getPropertyString(entity.properties, 'name', entity.id)
  const ability = getPropertyString(entity.properties, 'ability', '')
  const trainedOnly = entity.properties.trainedOnly

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-amber-500">
      <p className="font-bold">{name}</p>
      {ability && (
        <p className="text-sm text-gray-500 mt-1">Key Ability: {ability}</p>
      )}
      {typeof trainedOnly === 'boolean' && trainedOnly && (
        <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
          Trained Only
        </span>
      )}
    </div>
  )
}
