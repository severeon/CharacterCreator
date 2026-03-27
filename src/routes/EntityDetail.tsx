import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { getEntityById } from '../lib/engine'
import type { Entity } from '../lib/types'
import PropertyTable from '../components/PropertyTable'
import MdxRenderer from '../components/MdxRenderer'

export default function EntityDetail() {
  const { entityType, id } = useParams<{ entityType: string; id: string }>()
  const [entity, setEntity] = useState<Entity | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const decodedId = decodeURIComponent(id ?? '')

  useEffect(() => {
    setLoading(true)
    setNotFound(false)
    getEntityById(decodedId)
      .then((result) => {
        if (result === null) {
          setNotFound(true)
        } else {
          setEntity(result)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [decodedId])

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>

  if (notFound) {
    return (
      <div className="p-6">
        <Link to={`/${entityType}`} className="text-amber-600 hover:underline">
          &larr; Back to {entityType}
        </Link>
        <p className="mt-4 text-gray-500">Entity not found.</p>
      </div>
    )
  }

  if (!entity) return null

  const name = typeof entity.properties.name === 'string' ? entity.properties.name : entity.id

  return (
    <div className="p-6 max-w-3xl">
      <Link to={`/${entityType}`} className="text-amber-600 hover:underline">
        &larr; Back to {entityType}
      </Link>
      <h2 className="text-2xl font-bold mt-4 mb-2">{name}</h2>

      {entity.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {entity.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mb-6">
        <PropertyTable properties={entity.properties} />
      </div>

      {entity.mdx_body && (
        <div className="mt-4">
          <MdxRenderer source={entity.mdx_body} />
        </div>
      )}
    </div>
  )
}
