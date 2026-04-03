import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { getEntityById } from '../lib/engine'
import type { Entity } from '../lib/types'
import MdxRenderer from '../components/MdxRenderer'
import { ViewModeRenderer } from '../components/ViewModeRenderer'
import { useViewMode } from '../hooks/useViewMode'

export default function EntityDetail() {
  const { entityType, id } = useParams<{ entityType: string; id: string }>()
  const [entity, setEntity] = useState<Entity | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const decodedId = decodeURIComponent(id ?? '')
  const singularType = { races: 'race', classes: 'class', feats: 'feat', spells: 'spell', skills: 'skill' }[entityType ?? ''] ?? entityType ?? ''
  const viewMode = useViewMode(singularType, 'reference')

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    getEntityById(decodedId)
      .then((result) => {
        if (result === null) setNotFound(true)
        else setEntity(result)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [decodedId])

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="dnd-loading">Consulting the archives…</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link to={`/${entityType}`} className="dnd-back-link">← Back to {entityType}</Link>
        <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', color: 'var(--ink-light)', marginTop: '1rem' }}>
          This entry has been lost to the ages.
        </p>
      </div>
    )
  }

  if (!entity) return null

  const name = typeof entity.properties.name === 'string'
    ? entity.properties.name
    : entity.id.split(':').pop()?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? entity.id

  return (
    <div style={{ padding: '1.75rem 2rem', maxWidth: '56rem' }}>
      {/* Back navigation */}
      <Link to={`/${entityType}`} className="dnd-back-link">
        ← Back to {entityType}
      </Link>

      {/* Entry header — stat block style */}
      <div className="stat-block" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-block-header">
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.2rem', color: 'var(--parchment-light)', margin: 0 }}>
            {name}
          </h2>
        </div>

        {/* Tags row */}
        {entity.tags.length > 0 && (
          <div style={{
            padding: '5px 12px',
            borderBottom: '1px solid rgba(155, 120, 50, 0.25)',
            display: 'flex',
            flexWrap: 'wrap' as const,
            gap: '0.4rem',
            background: 'rgba(107, 20, 20, 0.04)',
          }}>
            {entity.tags.map((tag) => (
              <span key={tag} className="dnd-tag">{tag}</span>
            ))}
          </div>
        )}

        {/* Reference view metadata */}
        <div className="stat-block-body">
          <ViewModeRenderer entity={entity} viewMode={viewMode} />
        </div>
      </div>

      {/* MDX body — prose section */}
      {entity.mdx_body && (
        <div className="dnd-prose">
          <MdxRenderer source={entity.mdx_body} />
        </div>
      )}
    </div>
  )
}
