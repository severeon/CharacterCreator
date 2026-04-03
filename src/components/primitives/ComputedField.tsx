interface ComputedFieldProps {
  label: string
  value: string | number | null | undefined
  className?: string
}

export function ComputedField({ label, value, className = '' }: ComputedFieldProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-lg font-mono text-white">{value ?? '—'}</span>
    </div>
  )
}
