import { useState, useEffect, useRef } from 'react'

interface Props {
  onSearch: (query: string) => void
}

export default function SearchBar({ onSearch }: Props) {
  const [query, setQuery] = useState('')
  const hasInteracted = useRef(false)
  const prevOnSearch = useRef(onSearch)

  // When the parent swaps the handler (e.g. entity type changed), reset query
  // but don't fire a search — the parent's own effect already loaded fresh data.
  useEffect(() => {
    if (prevOnSearch.current !== onSearch) {
      prevOnSearch.current = onSearch
      hasInteracted.current = false
      setQuery('')
    }
  }, [onSearch])

  // Only debounce-search after actual user input — never on mount or handler swap
  useEffect(() => {
    if (!hasInteracted.current) return
    const timer = setTimeout(() => onSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally omit onSearch

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => { hasInteracted.current = true; setQuery(e.target.value) }}
      placeholder="Search the compendium…"
      className="dnd-search"
    />
  )
}
