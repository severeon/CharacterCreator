import type { BulletListProps } from '@/lib/types'

const spacingClasses = {
  tight: 'space-y-0.5',
  normal: 'space-y-1',
}

export function BulletList<T = unknown>({
  items,
  renderItem,
  spacing = 'normal',
}: BulletListProps<T>) {
  return (
    <ul className={`list-disc list-inside text-sm text-gray-800 ${spacingClasses[spacing]}`}>
      {items.map((item, i) => (
        <li key={i}>{renderItem ? renderItem(item, i) : String(item)}</li>
      ))}
    </ul>
  )
}
