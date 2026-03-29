import type { Entity, Value } from '../../../lib/types'
import { getPropertyString, getPropertyNumber } from '../../../lib/properties'
import { isObject, ABILITY_KEYS } from '../shared'
import { Badge } from '../../ui'

interface Props {
  entity: Entity
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
            <Badge key={chip} variant="amber">{chip}</Badge>
          ))}
        </div>
      )}
    </div>
  )
}
