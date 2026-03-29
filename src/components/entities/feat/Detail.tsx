import type { Entity } from '../../../lib/types'
import { isObject, ABILITY_KEYS } from '../shared'
import { DetailSection, BulletList } from '../../ui'

interface Props {
  entity: Entity
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
        <DetailSection title="Prerequisites">
          {/* Mixed-content prereq list: ability scores, BAB, feat names, special text.
              BulletList cannot express this structure — keeping custom list. */}
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
        </DetailSection>
      )}
      {hasBonusFeatFor && bonusFeatFor && (
        <DetailSection title="Bonus Feat For">
          <BulletList items={bonusFeatFor} />
        </DetailSection>
      )}
    </div>
  )
}
