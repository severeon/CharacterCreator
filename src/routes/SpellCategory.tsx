import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router'
import { getEntitiesByType, searchEntities } from '../lib/engine'
import type { EntitySummary, Entity } from '../lib/types'
import SearchBar from '../components/SearchBar'
import { ViewModeRenderer } from '../components/ViewModeRenderer'
import { useViewMode } from '../hooks/useViewMode'
import { devRender, devEffect, devState, devFetchStart, devFetchEnd } from '../lib/devlog'

function prettifyName(raw: string): string {
  const slug = raw.includes(':') ? (raw.split(':').pop() ?? raw) : raw
  if (slug === slug.toLowerCase()) {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  return slug
}

function summaryToEntity(summary: EntitySummary): Entity {
  const name = summary.name && summary.name !== summary.id
    ? prettifyName(summary.name)
    : prettifyName(summary.id)
  return {
    id: summary.id,
    entity_type: summary.entity_type,
    properties: { name },
    tags: summary.tags,
    mdx_body: '',
    source_pack: '',
  }
}

/** Build a tag filter string from the route params. */
function categoryTag(kind: string, value: string): string {
  switch (kind) {
    case 'school': return `school:${value}`
    case 'level': return `level:${value}`
    // Class names are bare tags (e.g. "Wizard")
    case 'class': return value.charAt(0).toUpperCase() + value.slice(1)
    default: return value
  }
}

function categoryLabel(kind: string, value: string): string {
  const cap = value.charAt(0).toUpperCase() + value.slice(1)
  switch (kind) {
    case 'school': return `${cap} Spells`
    case 'level': return value === '0' ? 'Cantrips' : `Level ${value} Spells`
    case 'class': return `${cap} Spell List`
    default: return `${cap} Spells`
  }
}

export default function SpellCategory() {
  const { kind, value } = useParams<{ kind: string; value: string }>()
  const [allSpells, setAllSpells] = useState<EntitySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<'az' | 'za'>('az')
  const cardViewMode = useViewMode('spell', 'card')

  const tag = categoryTag(kind ?? '', value ?? '')
  const label = categoryLabel(kind ?? '', value ?? '')

  devRender('SpellCategory', { kind, value, tag, loading, spellCount: allSpells.length })

  useEffect(() => {
    let stale = false
    devEffect('SpellCategory', 'loadSpells', { tag })
    setLoading(true)
    devFetchStart('SpellCategory', `getEntitiesByType(spell) [${tag}]`)
    getEntitiesByType('spell')
      .then(data => {
        if (stale) return
        // Filter out index entities and apply category tag
        const filtered = data.filter(e => !e.tags.includes('index') && e.tags.includes(tag))
        devFetchEnd('SpellCategory', `getEntitiesByType(spell) [${tag}]`, { count: filtered.length })
        devState('SpellCategory', 'allSpells', `[${allSpells.length} items]`, `[${filtered.length} items]`)
        setAllSpells(filtered)
      })
      .catch(() => { if (!stale) setAllSpells([]) })
      .finally(() => { if (!stale) setLoading(false) })
    return () => { stale = true }
  }, [tag])

  const handleSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setLoading(true)
        getEntitiesByType('spell')
          .then(data => setAllSpells(data.filter(e => !e.tags.includes('index') && e.tags.includes(tag))))
          .catch(() => setAllSpells([]))
          .finally(() => setLoading(false))
        return
      }
      setLoading(true)
      searchEntities(query)
        .then(results => setAllSpells(results.filter(e => e.entity_type === 'spell' && !e.tags.includes('index') && e.tags.includes(tag))))
        .catch(() => setAllSpells([]))
        .finally(() => setLoading(false))
    },
    [tag],
  )

  const visibleSpells = useMemo(() => {
    return [...allSpells].sort((a, b) => {
      const na = prettifyName(a.name || a.id)
      const nb = prettifyName(b.name || b.id)
      return sortOrder === 'az' ? na.localeCompare(nb) : nb.localeCompare(na)
    })
  }, [allSpells, sortOrder])

  return (
    <div style={{ padding: '1.75rem 2rem', maxWidth: '72rem' }}>
      <Link to="/spells" className="dnd-back-link">← Back to Spells</Link>
      <h2 className="dnd-page-header">{label}</h2>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
        <div className="dnd-search-wrap" style={{ flex: '1 1 18rem', maxWidth: '28rem' }}>
          <SearchBar onSearch={handleSearch} />
        </div>
        <button
          type="button"
          onClick={() => setSortOrder(o => o === 'az' ? 'za' : 'az')}
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '0.6rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '3px 9px',
            border: '1px solid var(--gold-rule)',
            background: 'var(--burgundy)',
            color: 'var(--parchment-light)',
            borderRadius: '2px',
            cursor: 'pointer',
          }}
        >
          {sortOrder === 'az' ? 'A → Z' : 'Z → A'}
        </button>
      </div>

      {loading ? (
        <div className="dnd-loading">Consulting the archives…</div>
      ) : visibleSpells.length === 0 ? (
        <div className="dnd-loading">No spells found in this category.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {visibleSpells.map(summary => (
            <Link
              key={summary.id}
              to={`/spells/${encodeURIComponent(summary.id)}`}
              style={{ textDecoration: 'none' }}
            >
              <ViewModeRenderer entity={summaryToEntity(summary)} viewMode={cardViewMode} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
