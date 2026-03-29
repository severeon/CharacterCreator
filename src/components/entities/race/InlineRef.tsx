import type { EntitySummary } from '../../../lib/types'

interface Props {
  entity: EntitySummary
}

export default function RaceInlineRef({ entity }: Props) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-gray-300 rounded text-sm bg-white">
      <span className="text-gray-400 text-xs">[{entity.entity_type.charAt(0).toUpperCase() + entity.entity_type.slice(1)}]</span>
      <span>{entity.name}</span>
    </span>
  )
}
