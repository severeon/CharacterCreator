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
      className={`w-full p-3 border rounded-lg text-left transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-amber-500'
      }`}
    >
      <p className="font-bold">{name}</p>
      {(size || speed > 0) && (
        <p className="text-sm text-gray-500 mt-0.5">
          {[size, speed > 0 ? `${speed} ft` : ''].filter(Boolean).join(' \u2022 ')}
        </p>
      )}
      {bonusSummary && (
        <p className="text-xs text-gray-600 mt-1">{bonusSummary}</p>
      )}
    </button>
  )
}
