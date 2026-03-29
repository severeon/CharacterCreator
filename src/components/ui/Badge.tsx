import type { BadgeProps } from '@/lib/types'

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  gray: 'bg-gray-100 text-gray-700',
}

export function Badge({ variant = 'gray', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}
