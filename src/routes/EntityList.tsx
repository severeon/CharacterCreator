import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router'
import { getEntitiesByType, searchEntities } from '../lib/engine'
import type { EntitySummary } from '../lib/types'
import SearchBar from '../components/SearchBar'

const TYPE_MAP: Record<string, string> = {
  races: 'race',
  classes: 'class',
  feats: 'feat',
  spells: 'spell',
}

export default function EntityList() {
  const { entityType } = useParams<{ entityType: string }>()
  const [entities, setEntities] = useState<EntitySummary[]>([])
  const [loading, setLoading] = useState(true)

  const singularType = TYPE_MAP[entityType ?? ''] ?? entityType ?? ''

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
        // TODO: use type-specific Card components when list loads full Entity objects
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map((entity) => (
            <Link
              key={entity.id}
              to={`/${entityType}/${encodeURIComponent(entity.id)}`}
              className="block p-4 border border-gray-200 rounded-lg hover:border-amber-500 hover:shadow-md transition-colors"
            >
              <h3 className="font-semibold text-lg">{entity.name}</h3>
              {entity.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {entity.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
