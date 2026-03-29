import type { KeyValueProps } from '@/lib/types'

export function KeyValue({ label, value, layout = 'row' }: KeyValueProps) {
  if (layout === 'inline') {
    return (
      <span className="text-sm">
        <span className="font-semibold text-gray-700">{label}</span>
        <span className="text-gray-800 ml-1">{value}</span>
      </span>
    )
  }

  if (layout === 'block') {
    return (
      <div>
        <span className="block font-semibold text-gray-700 mb-0.5">{label}</span>
        <span className="text-sm text-gray-800">{value}</span>
      </div>
    )
  }

  // row (default)
  return (
    <div className="flex gap-2 text-sm">
      <span className="font-semibold text-gray-700 w-40 shrink-0">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  )
}
