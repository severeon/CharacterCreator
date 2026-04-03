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

export function ReferenceView({ entity, slots }: ReferenceViewProps) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {slots.image?.value && (
        <div className="w-full h-64 bg-gray-900 overflow-hidden">
          <img
            src={String(slots.image.value)}
            alt={slots.title?.value ? String(slots.title.value) : ''}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-6">
        {slots.title?.value != null && (
          <h2 className="text-2xl font-bold text-white mb-1">{String(slots.title.value)}</h2>
        )}
        {slots.subtitle?.value != null && (
          <p className="text-gray-400 text-sm mb-4">
            {slots.subtitle.label ? `${slots.subtitle.label}: ` : ''}
            {String(slots.subtitle.value)}
          </p>
        )}
        {Object.entries(slots)
          .filter(([k]) => !['title', 'subtitle', 'image', 'body'].includes(k))
          .filter(([, v]) => v.value != null)
          .map(([key, slot]) => (
            <div key={key} className="flex gap-2 text-sm mb-1">
              {slot.label && (
                <span className="text-gray-500 min-w-24">{slot.label}:</span>
              )}
              <span className="text-gray-200">{String(slot.value)}</span>
            </div>
          ))}
        {slots.body?.value != null && (
          <div className="mt-4 text-gray-300 text-sm leading-relaxed">
            {String(slots.body.value)}
          </div>
        )}
        {!slots.body?.value && entity.mdx_body && (
          <div className="mt-4 text-gray-300 text-sm leading-relaxed">
            {entity.mdx_body}
          </div>
        )}
      </div>
    </div>
  )
}
