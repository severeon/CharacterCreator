interface TextFieldProps {
  label?: string
  value: string
  onChange?: (value: string) => void
  readOnly?: boolean
  className?: string
}

export function TextField({ label, value, onChange, readOnly = false, className = '' }: TextFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs text-gray-400 uppercase tracking-wide">{label}</label>
      )}
      {readOnly || !onChange ? (
        <span className="text-gray-200 text-sm">{value || '—'}</span>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-amber-500"
        />
      )}
    </div>
  )
}
