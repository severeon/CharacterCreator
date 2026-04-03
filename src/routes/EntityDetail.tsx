import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router'
import { getEntityById } from '../lib/engine'
import type { Entity } from '../lib/types'
import MdxRenderer from '../components/MdxRenderer'
import { ViewModeRenderer } from '../components/ViewModeRenderer'
import { useViewMode } from '../hooks/useViewMode'
import { devRender, devMount, devUnmount, devEffect, devState, devFetchStart, devFetchEnd } from '../lib/devlog'

export default function EntityDetail() {
  const { entityType, id } = useParams<{ entityType: string; id: string }>()
  const [entity, setEntity] = useState<Entity | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const renderCount = useRef(0)

  const decodedId = decodeURIComponent(id ?? '')
  // Derive type from URL param, or fall back to the loaded entity's type
  const TYPE_MAP: Record<string, string> = { races: 'race', classes: 'class', feats: 'feat', spells: 'spell', skills: 'skill' }
  const PLURAL_MAP: Record<string, string> = { race: 'races', class: 'classes', feat: 'feats', spell: 'spells', skill: 'skills' }
  const singularType = TYPE_MAP[entityType ?? ''] ?? entity?.entity_type ?? entityType ?? ''
  const pluralType = entityType ?? PLURAL_MAP[singularType] ?? ''
  const viewMode = useViewMode(singularType, 'reference')

  renderCount.current++
  devRender('EntityDetail', { renderNum: renderCount.current, entityType, id: decodedId, loading, notFound, hasEntity: !!entity })

  useEffect(() => {
    devMount('EntityDetail')
    return () => devUnmount('EntityDetail')
  }, [])

  useEffect(() => {
    let stale = false
    devEffect('EntityDetail', 'loadEntity', { decodedId })
    devState('EntityDetail', 'loading', loading, true)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setNotFound(false)
    devFetchStart('EntityDetail', `getEntityById(${decodedId})`)
    getEntityById(decodedId)
      .then((result) => {
        if (stale) return
        if (result === null) {
          devFetchEnd('EntityDetail', `getEntityById(${decodedId})`, { error: 'not found (null)' })
          setNotFound(true)
        } else {
          devFetchEnd('EntityDetail', `getEntityById(${decodedId})`, { count: 1 })
          setEntity(result)
        }
      })
      .catch((err) => {
        if (!stale) {
          devFetchEnd('EntityDetail', `getEntityById(${decodedId})`, { error: String(err) })
          setNotFound(true)
        }
      })
      .finally(() => { if (!stale) { devState('EntityDetail', 'loading', true, false); setLoading(false) } })
    return () => { stale = true }
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
        <Link to={`/${pluralType || 'races'}`} className="dnd-back-link">← Back to {pluralType || 'home'}</Link>
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

  // Build a context-aware back link — spells go to their school category
  let backTo = `/${pluralType}`
  let backLabel = pluralType
  if (entity.entity_type === 'spell' && !entity.tags.includes('index')) {
    const schoolTag = entity.tags.find(t => t.startsWith('school:'))
    if (schoolTag) {
      const school = schoolTag.split(':')[1]
      backTo = `/spells/school/${school}`
      backLabel = `${school.charAt(0).toUpperCase() + school.slice(1)} Spells`
    } else {
      backTo = '/spells'
      backLabel = 'Spells'
    }
  }

  return (
    <div style={{ padding: '1.75rem 2rem', maxWidth: '56rem' }}>
      {/* Back navigation */}
      <Link to={backTo} className="dnd-back-link">
        ← Back to {backLabel}
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
