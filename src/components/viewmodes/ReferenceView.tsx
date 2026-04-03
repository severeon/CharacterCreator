import type { Entity } from '../../lib/types'

interface ResolvedSlot {
  value: unknown
  label?: string
}

interface ReferenceViewProps {
  entity: Entity
  slots: Record<string, ResolvedSlot>
  theme?: Record<string, string>
}

export function ReferenceView({ slots }: ReferenceViewProps) {
  const hasImage = slots.image?.value != null

  const metaSlots = Object.entries(slots).filter(
    ([k]) => !['title', 'image', 'body'].includes(k)
  ).filter(([, v]) => v.value != null)

  if (hasImage) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="w-full h-64 bg-gray-900 overflow-hidden">
          <img
            src={String(slots.image!.value)}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-4 space-y-1">
          {metaSlots.map(([key, slot]) => (
            <div key={key} className="flex gap-2 text-sm">
              {slot.label && <span className="text-gray-500 min-w-24">{slot.label}:</span>}
              <span className="text-gray-200">{String(slot.value)}</span>
            </div>
          ))}
          {slots.body?.value != null && (
            <p className="mt-3 text-gray-300 text-sm leading-relaxed">{String(slots.body.value)}</p>
          )}
        </div>
      </div>
    )
  }

  // No image — render as a flat metadata list, no card wrapper
  return (
    <div className="space-y-1">
      {metaSlots.map(([key, slot]) => (
        <div key={key} className="flex gap-2 text-sm">
          {slot.label && <span className="text-gray-500 min-w-24">{slot.label}:</span>}
          <span className="text-gray-200">{String(slot.value)}</span>
        </div>
      ))}
      {slots.body?.value != null && (
        <p className="mt-3 text-gray-300 text-sm leading-relaxed">{String(slots.body.value)}</p>
      )}
    </div>
  )
}
