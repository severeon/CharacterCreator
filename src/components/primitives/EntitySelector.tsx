interface Option {
  id: string
  name: string
  description?: string
}

interface EntitySelectorProps {
  label?: string
  options: Option[]
  selectedId?: string
  onSelect?: (id: string) => void
  className?: string
}

export function EntitySelector({
  label,
  options,
  selectedId,
  onSelect,
  className = '',
}: EntitySelectorProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      )}
      <div className="space-y-1">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect?.(opt.id)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              selectedId === opt.id
                ? 'bg-amber-700 text-white'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            <span className="font-medium">{opt.name}</span>
            {opt.description && (
              <span className="block text-xs text-gray-400 mt-0.5 line-clamp-1">
                {opt.description}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
