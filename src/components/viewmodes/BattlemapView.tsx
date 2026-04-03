import type { Entity } from '../../lib/types'

interface ResolvedSlot {
  value: unknown
  label?: string
}

interface BattlemapViewProps {
  entity: Entity
  slots: Record<string, ResolvedSlot>
  theme?: Record<string, string>
}

export function BattlemapView({ slots }: BattlemapViewProps) {
  return (
    <div className="bg-gray-900 rounded border border-gray-600 p-3 w-32 text-center">
      {slots.token?.value ? (
        <img
          src={String(slots.token.value)}
          alt=""
          className="w-16 h-16 rounded-full mx-auto mb-2 object-cover border-2 border-amber-600"
        />
      ) : (
        <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-gray-700 flex items-center justify-center text-2xl">
          ⚔
        </div>
      )}
      {slots.title?.value != null && (
        <p className="text-xs font-bold text-white truncate">{String(slots.title.value)}</p>
      )}
      <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
        {slots.hp?.value != null && (
          <div className="bg-red-900/50 rounded px-1 py-0.5 text-red-300">
            HP {String(slots.hp.value)}
          </div>
        )}
        {slots.ac?.value != null && (
          <div className="bg-blue-900/50 rounded px-1 py-0.5 text-blue-300">
            AC {String(slots.ac.value)}
          </div>
        )}
      </div>
    </div>
  )
}
