// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EntityList } from './EntityList'

describe('EntityList', () => {
  it('renders string items', () => {
    render(<EntityList items={['Power Attack', 'Cleave']} />)
    expect(screen.getByText('Power Attack')).toBeTruthy()
    expect(screen.getByText('Cleave')).toBeTruthy()
  })

  it('renders object items by name property', () => {
    render(<EntityList items={[{ id: '1', name: 'Fireball' }]} />)
    expect(screen.getByText('Fireball')).toBeTruthy()
  })

  it('shows None for empty list', () => {
    render(<EntityList items={[]} />)
    expect(screen.getByText('None')).toBeTruthy()
  })

  it('handles non-array gracefully', () => {
    render(<EntityList items={null as unknown as unknown[]} />)
    expect(screen.getByText('None')).toBeTruthy()
  })
})
