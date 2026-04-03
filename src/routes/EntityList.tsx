import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router'
import { getEntitiesByType, searchEntities } from '../lib/engine'
import type { EntitySummary, Entity } from '../lib/types'
import SearchBar from '../components/SearchBar'
import { ViewModeRenderer } from '../components/ViewModeRenderer'
import { useViewMode } from '../hooks/useViewMode'

const TYPE_MAP: Record<string, string> = {
  races: 'race',
  classes: 'class',
  feats: 'feat',
  spells: 'spell',
}

/** Convert a raw entity ID or slug to a readable title-cased name. */
function prettifyName(raw: string): string {
  const slug = raw.includes(':') ? (raw.split(':').pop() ?? raw) : raw
  if (slug === slug.toLowerCase()) {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  return slug
}

function summaryToEntity(summary: EntitySummary): Entity {
  const name = summary.name && summary.name !== summary.id
    ? prettifyName(summary.name)
    : prettifyName(summary.id)
  return {
    id: summary.id,
    entity_type: summary.entity_type,
    properties: { name },
    tags: summary.tags,
    mdx_body: '',
    source_pack: '',
  }
}

export default function EntityList() {
  const { entityType } = useParams<{ entityType: string }>()
  const [entities, setEntities] = useState<EntitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'az' | 'za'>('az')

  const singularType = TYPE_MAP[entityType ?? ''] ?? entityType ?? ''
  const cardViewMode = useViewMode(singularType, 'card')

  useEffect(() => {
    setLoading(true)
    setActiveTag(null)
    getEntitiesByType(singularType)
      .then(setEntities)
      .catch(() => setEntities([]))
      .finally(() => setLoading(false))
  }, [singularType])

  const handleSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setLoading(true)
        getEntitiesByType(singularType)
          .then(setEntities)
          .catch(() => setEntities([]))
          .finally(() => setLoading(false))
        return
      }
      setLoading(true)
      searchEntities(query)
        .then((results) => setEntities(results.filter((e) => e.entity_type === singularType)))
        .catch(() => setEntities([]))
        .finally(() => setLoading(false))
    },
    [singularType],
  )

  // Collect unique tags from the full entity list (excluding generic type tags)
  const allTags = useMemo(() => {
    const skipPrefixes = ['source:', singularType + ':']
    const tagSet = new Set<string>()
    for (const e of entities) {
      for (const tag of e.tags) {
        if (!skipPrefixes.some(p => tag.startsWith(p)) && tag !== singularType) {
          tagSet.add(tag)
        }
      }
    }
    return Array.from(tagSet).sort()
  }, [entities, singularType])

  const visibleEntities = useMemo(() => {
    let list = activeTag ? entities.filter(e => e.tags.includes(activeTag)) : entities
    list = [...list].sort((a, b) => {
      const na = prettifyName(a.name || a.id)
      const nb = prettifyName(b.name || b.id)
      return sortOrder === 'az' ? na.localeCompare(nb) : nb.localeCompare(na)
    })
    return list
  }, [entities, activeTag, sortOrder])

  const typeLabel = entityType ? entityType.charAt(0).toUpperCase() + entityType.slice(1) : ''

  return (
    <div style={{ padding: '1.75rem 2rem', maxWidth: '72rem' }}>
      {/* Page header */}
      <h2 className="dnd-page-header">{typeLabel}</h2>

      {/* Search + sort row */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
        <div className="dnd-search-wrap" style={{ flex: '1 1 18rem', maxWidth: '28rem' }}>
          <SearchBar onSearch={handleSearch} />
        </div>
        <button
          type="button"
          onClick={() => setSortOrder(o => o === 'az' ? 'za' : 'az')}
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '0.6rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '3px 9px',
            border: '1px solid var(--gold-rule)',
            background: 'var(--burgundy)',
            color: 'var(--parchment-light)',
            borderRadius: '2px',
            cursor: 'pointer',
          }}
        >
          {sortOrder === 'az' ? 'A → Z' : 'Z → A'}
        </button>
      </div>

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
          <button
            onClick={() => setActiveTag(null)}
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.6rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '3px 9px',
              border: `1px solid ${activeTag === null ? 'var(--burgundy)' : 'rgba(107,20,20,0.25)'}`,
              background: activeTag === null ? 'var(--burgundy)' : 'rgba(107,20,20,0.08)',
              color: activeTag === null ? 'var(--parchment-light)' : 'var(--burgundy)',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '0.6rem',
                fontWeight: 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '3px 9px',
                border: `1px solid ${activeTag === tag ? 'var(--burgundy)' : 'rgba(107,20,20,0.25)'}`,
                background: activeTag === tag ? 'var(--burgundy)' : 'rgba(107,20,20,0.05)',
                color: activeTag === tag ? 'var(--parchment-light)' : 'var(--burgundy)',
                borderRadius: '2px',
                cursor: 'pointer',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="dnd-loading">Consulting the archives…</div>
      ) : visibleEntities.length === 0 ? (
        <div className="dnd-loading">No entries found in the compendium.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {visibleEntities.map((summary) => (
            <Link
              key={summary.id}
              to={`/${entityType}/${encodeURIComponent(summary.id)}`}
              style={{ textDecoration: 'none' }}
            >
              <ViewModeRenderer entity={summaryToEntity(summary)} viewMode={cardViewMode} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
