// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DataTable } from './DataTable'

describe('DataTable', () => {
  it('renders headers', () => {
    render(<DataTable headers={['Attack', 'Bonus']} rows={[]} />)
    expect(screen.getByText('Attack')).toBeTruthy()
    expect(screen.getByText('Bonus')).toBeTruthy()
  })

  it('renders rows with cells', () => {
    render(<DataTable headers={['Save', 'Total']} rows={[['Fortitude', '+4'], ['Reflex', '+2']]} />)
    expect(screen.getByText('Fortitude')).toBeTruthy()
    expect(screen.getByText('+4')).toBeTruthy()
    expect(screen.getByText('Reflex')).toBeTruthy()
  })

  it('handles non-array rows gracefully', () => {
    render(<DataTable headers={['Col']} rows={null} />)
    expect(screen.getByText('Col')).toBeTruthy()
  })
})
