import type { Entity } from '../../../lib/types'
import { getPropertyString } from '../../../lib/properties'
import { Badge } from '../../ui'

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
            <Badge key={tag} variant="amber">{tag}</Badge>
          ))}
        </div>
      )}
    </div>
  )
}
