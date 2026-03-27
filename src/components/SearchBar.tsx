import { useState, useEffect } from 'react'

interface Props {
  onSearch: (query: string) => void
}

export default function SearchBar({ onSearch }: Props) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => onSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, onSearch])

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search entities..."
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
    />
  )
}
