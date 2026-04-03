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

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 capitalize">{entityType}</h2>
      <div className="mb-4">
        <SearchBar onSearch={handleSearch} />
      </div>
      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : entities.length === 0 ? (
        <div className="text-gray-500">No entities found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map((summary) => (
            <Link
              key={summary.id}
              to={`/${entityType}/${encodeURIComponent(summary.id)}`}
              className="block"
            >
              <ViewModeRenderer entity={summaryToEntity(summary)} viewMode={cardViewMode} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
