import type { Entity, Value } from '../../../lib/types'

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

interface Props {
  entity: Entity
}

function isObject(v: Value): v is { [key: string]: Value } {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export default function FeatDetail({ entity }: Props) {
  const prereqsRaw = entity.properties.prereqs
  const prereqs = isObject(prereqsRaw) ? prereqsRaw : null

  const bonusFeatForRaw = entity.properties.bonusFeatFor
  const bonusFeatFor = Array.isArray(bonusFeatForRaw)
    ? bonusFeatForRaw.filter((v): v is string => typeof v === 'string')
    : null

  const prereqFeats = prereqs !== null && Array.isArray(prereqs.feats)
    ? prereqs.feats.filter((v): v is string => typeof v === 'string')
    : null

  const hasPrereqs =
    prereqs !== null &&
    Object.keys(prereqs).length > 0

  const hasBonusFeatFor = bonusFeatFor !== null && bonusFeatFor.length > 0

  return (
    <div className="space-y-4">
      {hasPrereqs && prereqs && (
        <section>
          <h3 className="font-semibold text-gray-700 mb-2">Prerequisites</h3>
          <ul className="space-y-1 text-sm text-gray-800">
            {ABILITY_KEYS.map((key) => {
              const val = prereqs[key]
              if (typeof val !== 'number') return null
              return (
                <li key={key}>
                  <span className="capitalize font-medium">{key}</span> {val}+
                </li>
              )
            })}
            {typeof prereqs.bab === 'number' && (
              <li>
                <span className="font-medium">Base Attack Bonus</span> +{prereqs.bab}
              </li>
            )}
            {prereqFeats && prereqFeats.length > 0 && (
              <li>
                <span className="font-medium">Feats:</span>{' '}
                {prereqFeats.join(', ')}
              </li>
            )}
            {typeof prereqs.special === 'string' && prereqs.special && (
              <li>
                <span className="font-medium">Special:</span> {prereqs.special}
              </li>
            )}
          </ul>
        </section>
      )}
      {hasBonusFeatFor && bonusFeatFor && (
        <section>
          <h3 className="font-semibold text-gray-700 mb-2">Bonus Feat For</h3>
          <ul className="list-disc list-inside text-sm text-gray-800">
            {bonusFeatFor.map((cls) => (
              <li key={cls}>{cls}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
