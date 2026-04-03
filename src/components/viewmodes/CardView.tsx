import type { Entity } from '../../lib/types'

interface ResolvedSlot {
  value: unknown
  label?: string
}

interface CardViewProps {
  entity: Entity
  slots: Record<string, ResolvedSlot>
  theme?: Record<string, string>
}

export function CardView({ slots }: CardViewProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-md border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer">
      {slots.thumbnail?.value && (
        <div className="w-full h-32 bg-gray-700 rounded mb-3 overflow-hidden">
          <img
            src={String(slots.thumbnail.value)}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {slots.title?.value != null && (
        <h3 className="text-lg font-semibold text-white">{String(slots.title.value)}</h3>
      )}
      {slots.subtitle?.value != null && (
        <p className="text-sm text-gray-400">
          {slots.subtitle.label ? `${slots.subtitle.label}: ` : ''}
          {String(slots.subtitle.value)}
        </p>
      )}
      {slots.badge?.value != null && (
        <span className="inline-block mt-2 px-2 py-0.5 bg-blue-900 text-blue-200 text-xs rounded">
          {slots.badge.label ? `${slots.badge.label}: ` : ''}
          {String(slots.badge.value)}
        </span>
      )}
      {slots.short_desc?.value != null && (
        <p className="text-sm text-gray-300 mt-2 line-clamp-2">
          {String(slots.short_desc.value)}
        </p>
      )}
    </div>
  )
}
