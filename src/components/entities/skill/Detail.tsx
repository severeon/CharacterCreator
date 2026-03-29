import type { Entity } from '../../../lib/types'
import { getPropertyString } from '../../../lib/properties'

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
      {ability && (
        <div className="flex gap-2 text-sm">
          <span className="font-semibold text-gray-700 w-40">Key Ability</span>
          <span className="text-gray-800">{ability}</span>
        </div>
      )}
      {typeof trainedOnlyRaw === 'boolean' && (
        <div className="flex gap-2 text-sm">
          <span className="font-semibold text-gray-700 w-40">Trained Only</span>
          <span className="text-gray-800">{trainedOnlyRaw ? 'Yes' : 'No'}</span>
        </div>
      )}
      {typeof armorCheckPenaltyRaw === 'boolean' && (
        <div className="flex gap-2 text-sm">
          <span className="font-semibold text-gray-700 w-40">Armor Check Penalty</span>
          <span className="text-gray-800">{armorCheckPenaltyRaw ? 'Yes' : 'No'}</span>
        </div>
      )}
      {synergies.length > 0 && (
        <section>
          <p className="font-semibold text-gray-700 mb-2">Synergies</p>
          <ul className="list-disc list-inside text-sm text-gray-800">
            {synergies.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
