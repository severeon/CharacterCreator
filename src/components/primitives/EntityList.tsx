interface EntityListProps {
  items: unknown
  itemViewMode?: string
  className?: string
}

export function EntityList({ items, itemViewMode, className = '' }: EntityListProps) {
  const itemArray: unknown[] = Array.isArray(items) ? items : []

  if (itemArray.length === 0) {
    return <p className="text-gray-500 text-sm italic">None</p>
  }

  return (
    <ul className={`space-y-1 ${className}`} data-view-mode={itemViewMode}>
      {itemArray.map((item, i) => (
        <li key={i} className="text-sm text-gray-200 py-0.5">
          {typeof item === 'object' && item !== null && 'name' in item
            ? String((item as Record<string, unknown>).name)
            : String(item ?? '')}
        </li>
      ))}
    </ul>
  )
}
