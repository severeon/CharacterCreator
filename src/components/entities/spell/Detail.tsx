import type { Entity } from '../../../lib/types'
import { getPropertyString, getPropertyNumber } from '../../../lib/properties'

interface Props {
  entity: Entity
}

export default function SpellDetail({ entity }: Props) {
  const school = getPropertyString(entity.properties, 'school', '')
  const level = getPropertyNumber(entity.properties, 'level', 0)

  const classesRaw = entity.properties.classes
  const castingClasses = Array.isArray(classesRaw)
    ? classesRaw.filter((v): v is string => typeof v === 'string')
    : []

  return (
    <div className="space-y-4">
      {school && (
        <div>
          <span className="font-semibold text-gray-700">School: </span>
          <span className="text-sm text-gray-800">{school}</span>
        </div>
      )}
      <div>
        <span className="font-semibold text-gray-700">Level: </span>
        <span className="text-sm text-gray-800">{level}</span>
      </div>
      {castingClasses.length > 0 && (
        <div>
          <span className="font-semibold text-gray-700">Casting Classes: </span>
          <span className="text-sm text-gray-800">{castingClasses.join(', ')}</span>
        </div>
      )}
    </div>
  )
}
