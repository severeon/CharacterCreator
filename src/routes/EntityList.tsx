import { useState, useEffect, useCallback } from 'react'
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

function summaryToEntity(summary: EntitySummary): Entity {
  return {
    id: summary.id,
    entity_type: summary.entity_type,
    properties: { name: summary.name },
    tags: summary.tags,
    mdx_body: '',
    source_pack: '',
  }
}

export default function EntityList() {
  const { entityType } = useParams<{ entityType: string }>()
  const [entities, setEntities] = useState<EntitySummary[]>([])
  const [loading, setLoading] = useState(true)

  const singularType = TYPE_MAP[entityType ?? ''] ?? entityType ?? ''
  const cardViewMode = useViewMode(singularType, 'card')

  useEffect(() => {
    setLoading(true)
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

  const typeLabel = entityType ? entityType.charAt(0).toUpperCase() + entityType.slice(1) : ''

  return (
    <div style={{ padding: '1.75rem 2rem', maxWidth: '72rem' }}>
      {/* Page header */}
      <h2 className="dnd-page-header">{typeLabel}</h2>

      {/* Search */}
      <div className="dnd-search-wrap" style={{ marginBottom: '1.5rem', maxWidth: '28rem' }}>
        <SearchBar onSearch={handleSearch} />
      </div>

      {loading ? (
        <div className="dnd-loading">Consulting the archives…</div>
      ) : entities.length === 0 ? (
        <div className="dnd-loading">No entries found in the compendium.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {entities.map((summary) => (
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
