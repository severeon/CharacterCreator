import type { Entity } from '../../lib/types'

interface ResolvedSlot {
  value: unknown
  label?: string
}

interface DMScreenViewProps {
  entity: Entity
  slots: Record<string, ResolvedSlot>
  theme?: Record<string, string>
}

export function DMScreenView({ slots }: DMScreenViewProps) {
  return (
    <div className="bg-gray-800 rounded border border-gray-600 p-3">
      {slots.title?.value != null && (
        <h4 className="text-sm font-bold text-amber-400 mb-2 border-b border-gray-600 pb-1">
          {String(slots.title.value)}
        </h4>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {Object.entries(slots)
          .filter(([k]) => k !== 'title')
          .filter(([, v]) => v.value != null)
          .map(([key, slot]) => (
            <div key={key} className="text-xs flex justify-between">
              <span className="text-gray-500">{slot.label || key}:</span>
              <span className="text-gray-200 font-mono">{String(slot.value)}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
