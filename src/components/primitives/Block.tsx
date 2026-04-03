import type { ReactNode } from 'react'

interface BlockProps {
  title?: string
  children: ReactNode
  className?: string
}

export function Block({ title, children, className = '' }: BlockProps) {
  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-4 ${className}`}>
      {title && (
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3 pb-2 border-b border-gray-700">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
