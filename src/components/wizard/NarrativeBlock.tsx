interface NarrativeBlockProps {
  config: { text?: string }
}

export function NarrativeBlock({ config }: NarrativeBlockProps) {
  return (
    <div className="prose prose-sm max-w-none text-gray-700">
      <p>{config.text ?? ''}</p>
    </div>
  )
}
