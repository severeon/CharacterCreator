import { useState, useEffect, useCallback, type MouseEvent } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router'
import * as runtime from 'react/jsx-runtime'
import { evaluate } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import { entityComponents } from './entities/registry'

interface Props {
  source: string
}

type MdxComponent = React.ComponentType<{ components?: Record<string, unknown> }>

export default function MdxRenderer({ source }: Props) {
  const [Content, setContent] = useState<MdxComponent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { entityType } = useParams<{ entityType: string }>()
  const location = useLocation()
  // Derive entity type from URL param or first path segment (for /spells/:id routes)
  const resolvedType = entityType ?? location.pathname.split('/')[1]

  useEffect(() => {
    let cancelled = false
    evaluate(source, { ...(runtime as Record<string, unknown>), development: false, remarkPlugins: [remarkGfm] } as Parameters<typeof evaluate>[1])
      .then(({ default: MDXContent }) => {
        if (!cancelled) setContent(() => MDXContent as unknown as MdxComponent)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(String(err))
      })
    return () => { cancelled = true }
  }, [source])

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href || !href.endsWith('.mdx')) return
      e.preventDefault()

      // Extract the filename stem (e.g. "evocation" from "./evocation.mdx" or "../spells.mdx")
      const stem = href.replace(/^.*\//, '').replace(/\.mdx$/, '')

      if (resolvedType === 'spells') {
        // "spells.mdx" → spell index; school names → school category; anything else → entity detail
        if (stem === 'spells') {
          navigate('/spells')
        } else {
          // Could be a school index (e.g. "evocation") or a spell (e.g. "burning-hands")
          // School indices match single lowercase words; spells have hyphens
          const isSchool = /^[a-z]+$/.test(stem)
          if (isSchool) {
            navigate(`/spells/school/${stem}`)
          } else {
            navigate(`/spells/${encodeURIComponent(`srd:spell:${stem}`)}`)
          }
        }
      } else {
        // For other entity types, try to navigate to the entity
        navigate(`/${resolvedType}/${encodeURIComponent(`srd:${resolvedType?.replace(/s$/, '')}:${stem}`)}`)
      }
    },
    [navigate, resolvedType],
  )

  if (error) return <div className="text-red-500 text-sm">MDX render error: {error}</div>
  if (!Content) return <div className="text-gray-400">Loading...</div>
  return (
    <div className="dnd-prose" onClick={handleClick}>
      <Content components={entityComponents as Record<string, unknown>} />
    </div>
  )
}
