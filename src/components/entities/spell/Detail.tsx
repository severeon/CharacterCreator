import type { Entity } from '../../../lib/types'
import { getPropertyString, getPropertyNumber } from '../../../lib/properties'
import { KeyValue } from '../../ui'

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
      {school && <KeyValue label="School" value={school} />}
      <KeyValue label="Level" value={String(level)} />
      {castingClasses.length > 0 && (
        <KeyValue label="Casting Classes" value={castingClasses.join(', ')} />
      )}
    </div>
  )
}
