import type { Entity, Value } from '../../../lib/types'
import { getPropertyString, getPropertyNumber } from '../../../lib/properties'
import { isObject } from '../shared'
import { Badge } from '../../ui'

interface Props {
  entity: Entity
}

function saveSummary(saves: Record<string, Value>): string {
  const fmt = (v: Value) => (v === 'good' ? 'G' : 'P')
  return `F:${fmt(saves.fort)} R:${fmt(saves.ref)} W:${fmt(saves.will)}`
}

export default function ClassCard({ entity }: Props) {
  const name = getPropertyString(entity.properties, 'name', entity.id)
  const hd = getPropertyNumber(entity.properties, 'hd', 0)
  const bab = getPropertyString(entity.properties, 'bab', '')
  const subtype = getPropertyString(entity.properties, 'subtype', '')

  const savesRaw = entity.properties.saves
  const saves = isObject(savesRaw) ? savesRaw : null

  const subtitleParts: string[] = []
  if (hd > 0) subtitleParts.push(`d${hd}`)
  if (bab) subtitleParts.push(`BAB: ${bab}`)
  if (saves !== null) subtitleParts.push(saveSummary(saves))

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-amber-500">
      <div className="flex items-center gap-2">
        <p className="font-bold">{name}</p>
        {subtype === 'prestige' && <Badge variant="purple">Prestige</Badge>}
      </div>
      {subtitleParts.length > 0 && (
        <p className="text-sm text-gray-500 mt-0.5">{subtitleParts.join(' | ')}</p>
      )}
    </div>
  )
}
