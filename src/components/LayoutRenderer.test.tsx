// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LayoutRenderer } from './LayoutRenderer'
import type { Layout, Character } from '../lib/types'

const mockLayout: Layout = {
  id: 'srd:layout:character-sheet',
  sections: [
    {
      id: 'identity',
      component: 'block',
      title: 'Identity',
      children: [
        { id: 'name', component: 'text-field', path: 'identity.name', label: 'Name' },
        { id: 'class', component: 'computed-field', formula: 'class_levels', label: 'Class' },
      ],
    },
    {
      id: 'abilities',
      component: 'block',
      title: 'Ability Scores',
      children: [
        { id: 'str', component: 'computed-field', label: 'STR', path: 'abilities.str.score' },
      ],
    },
  ],
}

const mockCharacter: Character = {
  properties: {
    'identity.name': 'Gimlet',
    'class_levels': 'Fighter 5',
    'abilities.str.score': 16,
  },
  computed_views: {},
}

describe('LayoutRenderer', () => {
  it('renders layout section titles', () => {
    render(<LayoutRenderer layout={mockLayout} character={mockCharacter} />)
    expect(screen.getByText('Identity')).toBeTruthy()
    expect(screen.getByText('Ability Scores')).toBeTruthy()
  })

  it('renders text-field primitive with value from properties', () => {
    render(<LayoutRenderer layout={mockLayout} character={mockCharacter} />)
    expect(screen.getByText('Gimlet')).toBeTruthy()
  })

  it('renders computed-field primitive with label', () => {
    render(<LayoutRenderer layout={mockLayout} character={mockCharacter} />)
    expect(screen.getByText('STR')).toBeTruthy()
  })

  it('resolves formula path from properties', () => {
    render(<LayoutRenderer layout={mockLayout} character={mockCharacter} />)
    expect(screen.getByText('Fighter 5')).toBeTruthy()
  })
})
