import type { DetailSectionProps } from '@/lib/types'

const spacingClasses = {
  tight: 'mb-1',
  normal: 'mb-2',
}

export function DetailSection({ title, children, spacing = 'normal' }: DetailSectionProps) {
  return (
    <section>
      <h3 className={`font-semibold text-gray-700 ${spacingClasses[spacing]}`}>{title}</h3>
      {children}
    </section>
  )
}
