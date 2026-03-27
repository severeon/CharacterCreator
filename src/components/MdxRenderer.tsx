import { useState, useEffect } from 'react'
import * as runtime from 'react/jsx-runtime'
import { evaluate } from '@mdx-js/mdx'

interface Props {
  source: string
}

export default function MdxRenderer({ source }: Props) {
  const [Content, setContent] = useState<React.ComponentType | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  if (error) return <div className="text-red-500 text-sm">MDX render error: {error}</div>
  if (!Content) return <div className="text-gray-400">Loading...</div>
  return <div className="prose prose-sm max-w-none"><Content /></div>
}
