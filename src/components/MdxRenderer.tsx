import { useState, useEffect, useCallback, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
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
      if (href && href.endsWith('.mdx')) {
        e.preventDefault()
        if (entityType) {
          navigate(`/${entityType}`)
        }
      }
    },
    [navigate, entityType],
  )

  if (error) return <div className="text-red-500 text-sm">MDX render error: {error}</div>
  if (!Content) return <div className="text-gray-400">Loading...</div>
  return (
    <div className="dnd-prose" onClick={handleClick}>
      <Content components={entityComponents as Record<string, unknown>} />
    </div>
  )
}
