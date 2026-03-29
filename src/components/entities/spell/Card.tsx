import type { Entity } from '../../../lib/types'
import { getPropertyString, getPropertyNumber } from '../../../lib/properties'

interface Props {
  entity: Entity
}

export default function SpellCard({ entity }: Props) {
  const name = getPropertyString(entity.properties, 'name', entity.id)
  const school = getPropertyString(entity.properties, 'school', '')
  const level = getPropertyNumber(entity.properties, 'level', 0)

  const classesRaw = entity.properties.classes
  const allClasses = Array.isArray(classesRaw)
    ? classesRaw.filter((v): v is string => typeof v === 'string')
    : []
  const displayClasses =
    allClasses.length > 3
      ? allClasses.slice(0, 3).join(', ') + '...'
      : allClasses.join(', ')

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-amber-500">
      <p className="font-bold">{name}</p>
      {(school || level !== undefined) && (
        <p className="text-sm text-gray-500 mt-1">
          {school}
          {school ? ' • ' : ''}Level {level}
        </p>
      )}
      {displayClasses && (
        <p className="text-xs text-gray-400 mt-1">{displayClasses}</p>
      )}
    </div>
  )
}
