import type { Entity, Value } from '../../../lib/types'
import { getPropertyString } from '../../../lib/properties'
import { isObject, ABILITY_KEYS } from '../shared'

interface Props {
  entity: Entity
}

export default function RaceDetail({ entity }: Props) {
  const bonusesRaw = entity.properties.bonuses
  const bonuses = isObject(bonusesRaw) ? bonusesRaw : null

  const bonusEntries: { key: string; val: number }[] = []
  if (bonuses !== null) {
    for (const key of ABILITY_KEYS) {
      const val = bonuses[key]
      if (typeof val === 'number' && val !== 0) {
        bonusEntries.push({ key, val })
      }
    }
  }

  const traitsRaw = entity.properties.traits
  const traits = Array.isArray(traitsRaw)
    ? traitsRaw.filter((v): v is string => typeof v === 'string')
    : []

  const physicalRaw = entity.properties.physical
  const physical = isObject(physicalRaw) ? physicalRaw : null
  const size = physical !== null ? getPropertyString(physical as Record<string, Value>, 'size', '') : ''

  // height: [minFt, minIn, maxFt, maxIn] — 4-element array from codegen
  // weight: [minLbs, maxLbs] — 2-element array from codegen
  const heightRaw = physical !== null ? physical.height : null
  const height = Array.isArray(heightRaw) ? heightRaw.filter((v): v is number => typeof v === 'number') : null

  const weightRaw = physical !== null ? physical.weight : null
  const weight = Array.isArray(weightRaw) ? weightRaw.filter((v): v is number => typeof v === 'number') : null

  const proficienciesRaw = entity.properties.proficiencies
  const proficiencies = Array.isArray(proficienciesRaw)
    ? proficienciesRaw.filter((v): v is string => typeof v === 'string')
    : []

  const hasPhysical = physical !== null && (size || (height && height.length >= 4) || (weight && weight.length >= 2))

  return (
    <div className="space-y-4">
      {bonusEntries.length > 0 && (
        <section>
          <h3 className="font-semibold text-gray-700 mb-2">Ability Score Adjustments</h3>
          <div className="flex flex-wrap gap-1">
            {bonusEntries.map(({ key, val }) => {
              const sign = val > 0 ? '+' : ''
              return (
                <span
                  key={key}
                  className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full"
                >
                  {sign}{val} {key.toUpperCase()}
                </span>
              )
            })}
          </div>
        </section>
      )}
      {traits.length > 0 && (
        <section>
          <h3 className="font-semibold text-gray-700 mb-2">Racial Traits</h3>
          <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
            {traits.map((trait) => (
              <li key={trait}>{trait}</li>
            ))}
          </ul>
        </section>
      )}
      {hasPhysical && (
        <section>
          <h3 className="font-semibold text-gray-700 mb-2">Physical Characteristics</h3>
          <ul className="text-sm text-gray-800 space-y-1">
            {size && (
              <li>
                <span className="font-medium">Size:</span> {size}
              </li>
            )}
            {height && height.length >= 4 && (
              <li>
                <span className="font-medium">Height:</span>{' '}
                {height[0]}&apos;{height[1]}&quot; &ndash; {height[2]}&apos;{height[3]}&quot;
              </li>
            )}
            {weight && weight.length >= 2 && (
              <li>
                <span className="font-medium">Weight:</span>{' '}
                {weight[0]} &ndash; {weight[1]} lb
              </li>
            )}
          </ul>
        </section>
      )}
      {proficiencies.length > 0 && (
        <section>
          <h3 className="font-semibold text-gray-700 mb-2">Proficiencies</h3>
          <p className="text-sm text-gray-800">{proficiencies.join(', ')}</p>
        </section>
      )}
    </div>
  )
}
