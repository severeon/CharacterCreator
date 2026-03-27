import { useState, useEffect, useCallback, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import * as runtime from 'react/jsx-runtime'
import { evaluate } from '@mdx-js/mdx'

interface Props {
  source: string
}

export default function MdxRenderer({ source }: Props) {
  const [Content, setContent] = useState<React.ComponentType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { entityType } = useParams<{ entityType: string }>()

  useEffect(() => {
    let cancelled = false
    evaluate(source, { ...(runtime as Record<string, unknown>), development: false } as Parameters<typeof evaluate>[1])
      .then(({ default: MDXContent }) => {
        if (!cancelled) setContent(() => MDXContent)
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
    <div className="prose prose-sm max-w-none" onClick={handleClick}>
      <Content />
    </div>
  )
}
