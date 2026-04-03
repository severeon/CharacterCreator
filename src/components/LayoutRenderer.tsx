import type { ReactNode } from 'react'
import { ComputedField } from './primitives/ComputedField'
import { Block } from './primitives/Block'
import { TextField } from './primitives/TextField'
import { ProgressBar } from './primitives/ProgressBar'
import { DataTable } from './primitives/DataTable'
import { EntityList } from './primitives/EntityList'
import { Divider } from './primitives/Divider'
import type { Layout, LayoutSection, LayoutChild, Character, Value } from '../lib/types'

interface LayoutRendererProps {
  layout: Layout
  character: Character
  onChange?: (path: string, value: unknown) => void
}

export function LayoutRenderer({ layout, character, onChange }: LayoutRendererProps) {
  return (
    <div className="space-y-6 p-4">
      {layout.sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          character={character}
          onChange={onChange}
        />
      ))}
    </div>
  )
}

function resolveValue(character: Character, path: string): Value | undefined {
  // Try flat key first (e.g. "abilities.str.score" stored directly)
  if (path in character.properties) return character.properties[path]
  // Try computed views
  if (character.computed_views && path in character.computed_views) {
    return character.computed_views[path]
  }
  // Try nested traversal
  const parts = path.split('.')
  let cursor: unknown = character.properties
  for (const part of parts) {
    if (cursor != null && typeof cursor === 'object' && !Array.isArray(cursor) && part in (cursor as object)) {
      cursor = (cursor as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return cursor as Value
}

function SectionRenderer({
  section,
  character,
  onChange,
}: {
  section: LayoutSection
  character: Character
  onChange?: (path: string, value: unknown) => void
}) {
  if (section.component === 'block') {
    return (
      <Block title={section.title}>
        <div className={section.children && section.children.length > 2 ? 'grid grid-cols-2 gap-4' : 'space-y-3'}>
          {section.children?.map((child) => (
            <ChildRenderer key={child.id} child={child} character={character} onChange={onChange} />
          ))}
        </div>
      </Block>
    )
  }
  if (section.component === 'divider') {
    return <Divider label={section.title} />
  }
  // Fallback: render children flat
  return (
    <div>
      {section.children?.map((child) => (
        <ChildRenderer key={child.id} child={child} character={character} onChange={onChange} />
      ))}
    </div>
  )
}

function ChildRenderer({
  child,
  character,
  onChange,
}: {
  child: LayoutChild
  character: Character
  onChange?: (path: string, value: unknown) => void
}): ReactNode {
  const resolve = (p: string): Value | undefined => resolveValue(character, p)

  switch (child.component) {
    case 'computed-field': {
      const val = resolve(child.path ?? child.formula ?? '')
      return <ComputedField label={child.label ?? ''} value={val as string | number | null | undefined} />
    }
    case 'text-field': {
      const val = resolve(child.path ?? '')
      return (
        <TextField
          label={child.label}
          value={val != null ? String(val) : ''}
          onChange={child.path && onChange ? (v) => onChange(child.path!, v) : undefined}
        />
      )
    }
    case 'progress-bar': {
      const cur = Number(resolve(child.path ?? '') ?? 0)
      const max = Number(resolve(child.max_path ?? '') ?? 1)
      return <ProgressBar label={child.label ?? ''} current={cur} max={max} />
    }
    case 'table': {
      const rows = resolve(child.rows_path ?? '')
      return <DataTable headers={child.headers ?? []} rows={rows} />
    }
    case 'list': {
      const items = resolve(child.source_path ?? '')
      return <EntityList items={items} itemViewMode={child.item_view_mode} />
    }
    case 'divider':
      return <Divider />
    default:
      return null
  }
}
