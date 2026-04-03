interface DividerProps {
  label?: string
  className?: string
}

export function Divider({ label, className = '' }: DividerProps) {
  if (label) {
    return (
      <div className={`flex items-center gap-3 my-2 ${className}`}>
        <div className="flex-1 h-px bg-gray-700" />
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
        <div className="flex-1 h-px bg-gray-700" />
      </div>
    )
  }
  return <hr className={`border-gray-700 my-2 ${className}`} />
}
