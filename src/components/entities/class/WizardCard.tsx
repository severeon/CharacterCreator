import type { Entity } from '../../../lib/types'
import { getPropertyString, getPropertyNumber } from '../../../lib/properties'

interface Props {
  entity: Entity
  selected?: boolean
  onSelect?: (id: string) => void
}

export default function ClassWizardCard({ entity, selected = false, onSelect }: Props) {
  const name = getPropertyString(entity.properties, 'name', entity.id)
  const hd = getPropertyNumber(entity.properties, 'hd', 0)
  const bab = getPropertyString(entity.properties, 'bab', '')

  const subtitleParts: string[] = []
  if (hd > 0) subtitleParts.push(`d${hd}`)
  if (bab) subtitleParts.push(`BAB: ${bab}`)

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
      {subtitleParts.length > 0 && (
        <p className="text-sm text-gray-600 mt-0.5">{subtitleParts.join(' | ')}</p>
      )}
    </button>
  )
}
