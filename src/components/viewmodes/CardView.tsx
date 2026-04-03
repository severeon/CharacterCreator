import type { Entity } from '../../lib/types'

interface ResolvedSlot {
  value: unknown
  label?: string
}

interface CardViewProps {
  entity: Entity
  slots: Record<string, ResolvedSlot>
  theme?: Record<string, string>
}

export function CardView({ entity, slots }: CardViewProps) {
  return (
    <div className="entity-card">
      {slots.thumbnail?.value && (
        <div style={{ width: '100%', height: '7rem', overflow: 'hidden', background: 'var(--parchment-dark)' }}>
          <img
            src={String(slots.thumbnail.value)}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      <div className="entity-card-title">
        {slots.title?.value != null ? String(slots.title.value) : '—'}
      </div>

      <div className="entity-card-body">
        {slots.subtitle?.value != null && (
          <div style={{ marginBottom: '3px', color: 'var(--ink-light)', fontSize: '0.75rem' }}>
            {slots.subtitle.label ? (
              <>
                <span style={{ fontWeight: 700, fontFamily: "'Cinzel', serif", fontSize: '0.65rem', letterSpacing: '0.04em' }}>
                  {slots.subtitle.label}:
                </span>{' '}
                {String(slots.subtitle.value)}
              </>
            ) : String(slots.subtitle.value)}
          </div>
        )}

        {slots.badge?.value != null && (
          <div style={{
            display: 'inline-block',
            background: 'var(--burgundy)',
            color: 'var(--parchment-light)',
            fontFamily: "'Cinzel', serif",
            fontSize: '0.6rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            padding: '2px 7px',
            marginTop: '4px',
          }}>
            {slots.badge.label ? `${slots.badge.label} ${String(slots.badge.value)}` : String(slots.badge.value)}
          </div>
        )}

        {slots.short_desc?.value != null && (
          <div style={{
            marginTop: '5px',
            fontSize: '0.75rem',
            color: 'var(--ink-mid)',
            fontStyle: 'italic',
            fontFamily: "'IM Fell English', Georgia, serif",
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {String(slots.short_desc.value)}
          </div>
        )}

        {/* Fallback: show tags when no other body content is available */}
        {slots.subtitle?.value == null && slots.badge?.value == null && slots.short_desc?.value == null && entity.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
            {entity.tags.slice(0, 3).map(tag => (
              <span key={tag} className="dnd-tag" style={{ fontSize: '0.55rem' }}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
