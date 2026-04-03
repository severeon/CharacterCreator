interface ProgressBarProps {
  label: string
  current: number
  max: number
  segments?: number
}

export function ProgressBar({ label, current, max, segments = 10 }: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1
  const filled = Math.round((current / safeMax) * segments)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-mono text-white">
          {current}/{max}
        </span>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-3 flex-1 rounded-sm ${i < filled ? 'bg-green-600' : 'bg-gray-700'}`}
          />
        ))}
      </div>
    </div>
  )
}
