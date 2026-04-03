// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ComputedField } from './ComputedField'

describe('ComputedField', () => {
  it('renders label and numeric value', () => {
    render(<ComputedField label="Strength" value={16} />)
    expect(screen.getByText('Strength')).toBeTruthy()
    expect(screen.getByText('16')).toBeTruthy()
  })

  it('renders string values', () => {
    render(<ComputedField label="Class" value="Fighter" />)
    expect(screen.getByText('Fighter')).toBeTruthy()
  })

  it('renders dash for null value', () => {
    render(<ComputedField label="Save" value={null} />)
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('renders dash for undefined value', () => {
    render(<ComputedField label="Save" value={undefined} />)
    expect(screen.getByText('—')).toBeTruthy()
  })
})
