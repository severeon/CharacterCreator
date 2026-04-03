interface NarrativeBlockProps {
  content: string
  className?: string
}

export function NarrativeBlock({ content, className = '' }: NarrativeBlockProps) {
  return (
    <div className={`text-sm text-gray-300 leading-relaxed whitespace-pre-wrap ${className}`}>
      {content}
    </div>
  )
}
