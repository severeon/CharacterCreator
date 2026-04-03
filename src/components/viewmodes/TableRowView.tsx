import type { Entity } from '../../lib/types'

interface ResolvedSlot {
  value: unknown
  label?: string
}

interface TableRowViewProps {
  entity: Entity
  slots: Record<string, ResolvedSlot>
  theme?: Record<string, string>
}

export function TableRowView({ slots }: TableRowViewProps) {
  const slotEntries = Object.entries(slots).filter(([, v]) => v.value != null)
  return (
    <div className="flex items-center gap-4 px-3 py-1.5 border-b border-gray-700 hover:bg-gray-750 text-sm">
      {slots.title?.value != null && (
        <span className="font-medium text-white min-w-32 flex-shrink-0">
          {String(slots.title.value)}
        </span>
      )}
      {slotEntries
        .filter(([k]) => k !== 'title')
        .map(([key, slot]) => (
          <span key={key} className="text-gray-400">
            {slot.label ? `${slot.label}: ` : ''}
            <span className="text-gray-200">{String(slot.value)}</span>
          </span>
        ))}
    </div>
  )
}
