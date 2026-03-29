import type { Entity } from '../../../lib/types'
import { getPropertyString } from '../../../lib/properties'

interface Props {
  entity: Entity
}

export default function FeatCard({ entity }: Props) {
  const name = getPropertyString(entity.properties, 'name', entity.id)
  const visibleTags = entity.tags.filter((t) => !t.startsWith('source:'))

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-amber-500">
      <p className="font-bold">{name}</p>
      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
