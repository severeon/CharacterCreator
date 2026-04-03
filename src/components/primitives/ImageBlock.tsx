interface ImageBlockProps {
  src: string
  alt?: string
  caption?: string
  className?: string
}

export function ImageBlock({ src, alt = '', caption, className = '' }: ImageBlockProps) {
  return (
    <figure className={`flex flex-col gap-1 ${className}`}>
      <div className="overflow-hidden rounded bg-gray-700">
        <img src={src} alt={alt} className="w-full h-auto object-cover" />
      </div>
      {caption && (
        <figcaption className="text-xs text-gray-500 text-center">{caption}</figcaption>
      )}
    </figure>
  )
}
