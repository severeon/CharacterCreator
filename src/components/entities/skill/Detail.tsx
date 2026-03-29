import type { Entity } from '../../../lib/types'
import { getPropertyString } from '../../../lib/properties'
import { DetailSection, KeyValue, BulletList } from '../../ui'

interface Props {
  entity: Entity
}

export default function SkillDetail({ entity }: Props) {
  const ability = getPropertyString(entity.properties, 'ability', '')
  const trainedOnlyRaw = entity.properties.trainedOnly
  const armorCheckPenaltyRaw = entity.properties.armorCheckPenalty

  const synergiesRaw = entity.properties.synergies
  const synergies = Array.isArray(synergiesRaw)
    ? synergiesRaw.filter((v): v is string => typeof v === 'string')
    : []

  return (
    <div className="space-y-3">
      {ability && <KeyValue label="Key Ability" value={ability} />}
      {typeof trainedOnlyRaw === 'boolean' && (
        <KeyValue label="Trained Only" value={trainedOnlyRaw ? 'Yes' : 'No'} />
      )}
      {typeof armorCheckPenaltyRaw === 'boolean' && (
        <KeyValue label="Armor Check Penalty" value={armorCheckPenaltyRaw ? 'Yes' : 'No'} />
      )}
      {synergies.length > 0 && (
        <DetailSection title="Synergies">
          <BulletList items={synergies} />
        </DetailSection>
      )}
    </div>
  )
}
