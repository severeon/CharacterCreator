import type { Entity, Value } from '../../../lib/types'
import { getPropertyString } from '../../../lib/properties'
import { isObject, ABILITY_KEYS } from '../shared'
import { DetailSection, Badge, BulletList } from '../../ui'

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
        <DetailSection title="Ability Score Adjustments">
          <div className="flex flex-wrap gap-1">
            {bonusEntries.map(({ key, val }) => {
              const sign = val > 0 ? '+' : ''
              return (
                <Badge key={key} variant="amber">
                  {sign}{val} {key.toUpperCase()}
                </Badge>
              )
            })}
          </div>
        </DetailSection>
      )}
      {traits.length > 0 && (
        <DetailSection title="Racial Traits">
          <BulletList items={traits} />
        </DetailSection>
      )}
      {hasPhysical && (
        <DetailSection title="Physical Characteristics">
          {/* DISPLAY-PRIMITIVE-MISSING: unstyled list with inline font-medium labels (Size, Height, Weight).
              BulletList forces list-disc list-inside which is wrong here. */}
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
        </DetailSection>
      )}
      {proficiencies.length > 0 && (
        <DetailSection title="Proficiencies">
          <p className="text-sm text-gray-800">{proficiencies.join(', ')}</p>
        </DetailSection>
      )}
    </div>
  )
}
