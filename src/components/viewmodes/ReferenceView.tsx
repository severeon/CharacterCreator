import type { Entity } from '../../lib/types'

interface ResolvedSlot {
  value: unknown
  label?: string
}

interface ReferenceViewProps {
  entity: Entity
  slots: Record<string, ResolvedSlot>
  theme?: Record<string, string>
}

export function ReferenceView({ slots }: ReferenceViewProps) {
  const hasImage = slots.image?.value != null

  const metaSlots = Object.entries(slots).filter(
    ([k]) => !['title', 'image', 'body'].includes(k)
  ).filter(([, v]) => v.value != null)

  const bodyContent = slots.body?.value != null ? String(slots.body.value) : null

  if (hasImage) {
    return (
      <div>
        <div style={{ width: '100%', maxHeight: '16rem', overflow: 'hidden', marginBottom: '0.75rem' }}>
          <img src={String(slots.image!.value)} alt="" style={{ width: '100%', objectFit: 'cover' }} />
        </div>
        {metaSlots.length > 0 && (
          <div>
            {metaSlots.map(([key, slot]) => (
              <div key={key} className="stat-block-row">
                {slot.label && <span className="stat-block-label">{slot.label}</span>}
                <span style={{ color: 'var(--ink)', fontSize: '0.875rem' }}>{String(slot.value)}</span>
              </div>
            ))}
          </div>
        )}
        {bodyContent && (
          <p style={{ marginTop: '0.75rem', color: 'var(--ink-mid)', fontSize: '0.875rem', lineHeight: 1.6, fontStyle: 'italic' }}>
            {bodyContent}
          </p>
        )}
      </div>
    )
  }

  // No image — stat-block rows
  if (metaSlots.length === 0 && !bodyContent) return null

  return (
    <div>
      {metaSlots.map(([key, slot]) => (
        <div key={key} className="stat-block-row">
          {slot.label && <span className="stat-block-label">{slot.label}</span>}
          <span style={{ color: 'var(--ink)', fontSize: '0.875rem' }}>{String(slot.value)}</span>
        </div>
      ))}
      {bodyContent && (
        <p style={{ marginTop: '0.75rem', color: 'var(--ink-mid)', fontSize: '0.875rem', lineHeight: 1.6, fontStyle: 'italic', fontFamily: "'IM Fell English', Georgia, serif" }}>
          {bodyContent}
        </p>
      )}
    </div>
  )
}
