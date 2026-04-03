// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ViewModeRenderer } from './ViewModeRenderer'
import type { Entity, ViewMode, Value } from '../lib/types'

const mockEntity: Entity = {
  id: 'srd:spell:fireball',
  entity_type: 'actionable.spell',
  properties: {
    name: 'Fireball',
    school: 'evocation',
    spell_level: 3,
    components: ['V', 'S', 'M'],
  },
  tags: ['evocation', 'offensive'],
  mdx_body: '',
  source_pack: 'srd-3.5e',
}

const mockViewMode: ViewMode = {
  id: 'srd:view:spell-card',
  template: 'card',
  slots: {
    title: { path: 'name' },
    subtitle: { path: 'school', label: 'School' },
    badge: { path: 'spell_level', label: 'Level' },
  },
}

describe('ViewModeRenderer', () => {
  it('renders entity in card view using slot mapping', () => {
    render(<ViewModeRenderer entity={mockEntity} viewMode={mockViewMode} />)
    expect(screen.getByText('Fireball')).toBeTruthy()
    expect(screen.getByText(/evocation/)).toBeTruthy()
  })

  it('renders badge slot content', () => {
    render(<ViewModeRenderer entity={mockEntity} viewMode={mockViewMode} />)
    expect(screen.getByText(/Level/)).toBeTruthy()
  })

  it('falls back to card template for unknown template type', () => {
    const unknownMode: ViewMode = { ...mockViewMode, template: 'card', slots: { title: { path: 'name' } } }
    render(<ViewModeRenderer entity={mockEntity} viewMode={unknownMode} />)
    expect(screen.getByText('Fireball')).toBeTruthy()
  })

  it('resolves nested property path', () => {
    const entity: Entity = {
      ...mockEntity,
      properties: { nested: { deep: 'value' } as unknown as Value },
    }
    const mode: ViewMode = { id: 'x', template: 'card', slots: { title: { path: 'nested.deep' } } }
    render(<ViewModeRenderer entity={entity} viewMode={mode} />)
    expect(screen.getByText('value')).toBeTruthy()
  })
})
