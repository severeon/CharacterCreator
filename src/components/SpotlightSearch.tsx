import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { searchEntities } from '../lib/engine'
import { prettifyName } from '../lib/prettifyName'
import type { EntitySummary } from '../lib/types'
import { devRender, devMount, devUnmount, devEffect, devState, devFetchStart, devFetchEnd } from '../lib/devlog'

const MAX_PER_GROUP = 8

const GROUP_ORDER = [
  { type: 'race', plural: 'races', label: 'Races' },
  { type: 'class', plural: 'classes', label: 'Classes' },
  { type: 'feat', plural: 'feats', label: 'Feats' },
  { type: 'spell', plural: 'spells', label: 'Spells' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function SpotlightSearch({ isOpen, onClose }: Props) {
  devRender('SpotlightSearch', { isOpen })

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<EntitySummary[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevFocus = useRef<Element | null>(null)
  const navigate = useNavigate()

  // Mount/unmount logging
  useEffect(() => {
    devMount('SpotlightSearch')
    return () => devUnmount('SpotlightSearch')
  }, [])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      prevFocus.current = document.activeElement
      // Delay to let the dialog render
      requestAnimationFrame(() => inputRef.current?.focus())
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    } else if (prevFocus.current instanceof HTMLElement) {
      prevFocus.current.focus()
    }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults([])
      return
    }
    devEffect('SpotlightSearch', 'search', query)
    const timer = setTimeout(() => {
      setIsLoading(true)
      devFetchStart('SpotlightSearch', `search("${query}")`)
      searchEntities(query)
        .then(r => {
          devFetchEnd('SpotlightSearch', `search("${query}")`, { count: r.length })
          setResults(r)
          setSelectedIndex(0)
        })
        .catch(err => {
          devFetchEnd('SpotlightSearch', `search("${query}")`, { error: String(err) })
          setResults([])
        })
        .finally(() => setIsLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [query, isOpen])

  // Group results by entity type
  const groups = useMemo(() => {
    const byType: Record<string, EntitySummary[]> = {}
    for (const r of results) {
      if (!byType[r.entity_type]) byType[r.entity_type] = []
      byType[r.entity_type].push(r)
    }
    return GROUP_ORDER
      .filter(g => byType[g.type]?.length)
      .map(g => ({
        ...g,
        items: byType[g.type].slice(0, MAX_PER_GROUP),
        totalCount: byType[g.type].length,
      }))
  }, [results])

  // Flat list of all visible results for keyboard nav
  const flatItems = useMemo(
    () => groups.flatMap(g => g.items),
    [groups],
  )

  const navigateToResult = useCallback((item: EntitySummary) => {
    const group = GROUP_ORDER.find(g => g.type === item.entity_type)
    const plural = group?.plural ?? `${item.entity_type}s`
    const path = `/${plural}/${encodeURIComponent(item.id)}`
    devState('SpotlightSearch', 'navigate', null, path)
    navigate(path)
    onClose()
  }, [navigate, onClose])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
      e.preventDefault()
      navigateToResult(flatItems[selectedIndex])
    }
  }

  if (!isOpen) return null

  const activeId = flatItems[selectedIndex]?.id

  return (
    <div
      className="spotlight-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Search the compendium"
      onKeyDown={handleKeyDown}
    >
      <div className="spotlight-dialog">
        <div className="spotlight-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="spotlight-input"
            placeholder="Search races, classes, feats, spells…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            role="combobox"
            aria-expanded={flatItems.length > 0}
            aria-controls="spotlight-results"
            aria-activedescendant={activeId ? `spotlight-item-${activeId}` : undefined}
          />
        </div>

        <div className="spotlight-results" id="spotlight-results" role="listbox">
          {!query.trim() && (
            <div className="spotlight-hint">
              Search the compendium by name or tag…
            </div>
          )}
          {query.trim() && !isLoading && flatItems.length === 0 && (
            <div className="spotlight-hint">
              No entries found.
            </div>
          )}
          {groups.map(group => {
            let groupStartIndex = 0
            for (const g of groups) {
              if (g.type === group.type) break
              groupStartIndex += g.items.length
            }
            return (
              <div key={group.type}>
                <div className="spotlight-group-header">
                  {group.label}
                  {group.totalCount > MAX_PER_GROUP && (
                    <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: '0.5em' }}>
                      ({group.totalCount})
                    </span>
                  )}
                </div>
                {group.items.map((item, i) => {
                  const flatIndex = groupStartIndex + i
                  const isActive = flatIndex === selectedIndex
                  const displayName = item.name && item.name !== item.id
                    ? prettifyName(item.name)
                    : prettifyName(item.id)
                  return (
                    <div
                      key={item.id}
                      id={`spotlight-item-${item.id}`}
                      className={`spotlight-result${isActive ? ' spotlight-result--active' : ''}`}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => navigateToResult(item)}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                    >
                      <span className="spotlight-result-name">{displayName}</span>
                      <span className="spotlight-type-badge">{group.label.slice(0, -1)}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
