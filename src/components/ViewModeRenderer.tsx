import { CardView } from './viewmodes/CardView'
import { ReferenceView } from './viewmodes/ReferenceView'
import { TableRowView } from './viewmodes/TableRowView'
import { BattlemapView } from './viewmodes/BattlemapView'
import { DMScreenView } from './viewmodes/DMScreenView'
import type { ViewMode, Entity, Value } from '../lib/types'

interface ViewModeRendererProps {
  entity: Entity
  viewMode: ViewMode
  theme?: Record<string, string>
}

function resolvePathInEntity(entity: Entity, path: string): unknown {
  const parts = path.split('.')
  // Try top-level properties first
  let value: Value | undefined = entity.properties[parts[0]]
  if (parts.length === 1) return value

  // Try nested in properties
  let cursor: unknown = entity.properties
  for (const part of parts) {
    if (cursor != null && typeof cursor === 'object' && !Array.isArray(cursor) && part in (cursor as object)) {
      cursor = (cursor as Record<string, unknown>)[part]
    } else {
      cursor = undefined
      break
    }
  }
  if (cursor !== undefined) return cursor

  // Fall back to dot-notation key directly on properties (flat key like "abilities.str.score")
  return entity.properties[path]
}

export function ViewModeRenderer({ entity, viewMode, theme }: ViewModeRendererProps) {
  const resolvedSlots: Record<string, { value: unknown; label?: string }> = {}

  for (const [slotName, slotConfig] of Object.entries(viewMode.slots ?? {})) {
    if (!slotConfig) {
      resolvedSlots[slotName] = { value: null }
      continue
    }
    resolvedSlots[slotName] = {
      value: slotConfig.path ? resolvePathInEntity(entity, slotConfig.path) : undefined,
      label: slotConfig.label,
    }
  }

  const props = { entity, slots: resolvedSlots, theme }

  switch (viewMode.template) {
    case 'reference':
      return <ReferenceView {...props} />
    case 'table-row':
      return <TableRowView {...props} />
    case 'battlemap':
      return <BattlemapView {...props} />
    case 'dm-screen':
      return <DMScreenView {...props} />
    case 'card':
    default:
      return <CardView {...props} />
  }
}
