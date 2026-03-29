import type { Entity, Value } from '../../../lib/types'
import { getPropertyString, getPropertyNumber } from '../../../lib/properties'

interface Props {
  entity: Entity
}

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

function isObject(v: Value): v is { [key: string]: Value } {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export default function RaceCard({ entity }: Props) {
  const name = getPropertyString(entity.properties, 'name', entity.id)
  const la = getPropertyNumber(entity.properties, 'la', 0)

  const physicalRaw = entity.properties.physical
  const physical = isObject(physicalRaw) ? physicalRaw : null
  const size = physical !== null ? getPropertyString(physical as Record<string, Value>, 'size', '') : ''

  const bonusesRaw = entity.properties.bonuses
  const bonuses = isObject(bonusesRaw) ? bonusesRaw : null

  const bonusChips: string[] = []
  if (bonuses !== null) {
    for (const key of ABILITY_KEYS) {
      const val = bonuses[key]
      if (typeof val === 'number' && val !== 0) {
        const sign = val > 0 ? '+' : ''
        bonusChips.push(`${sign}${val} ${key.toUpperCase()}`)
      }
    }
  }

  const subtitle: string[] = []
  if (size) subtitle.push(size)
  if (la > 0) subtitle.push(`LA +${la}`)

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-amber-500">
      <p className="font-bold">{name}</p>
      {subtitle.length > 0 && (
        <p className="text-sm text-gray-500 mt-0.5">{subtitle.join(' \u2022 ')}</p>
      )}
      {bonusChips.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {bonusChips.map((chip) => (
            <span
              key={chip}
              className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full"
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
