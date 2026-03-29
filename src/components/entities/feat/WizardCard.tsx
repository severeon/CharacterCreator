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
      className={`w-full p-3 border rounded-lg text-left transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-amber-500'
      }`}
    >
      <p className="font-bold">{name}</p>
      {benefit && (
        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{benefit}</p>
      )}
    </button>
  )
}
