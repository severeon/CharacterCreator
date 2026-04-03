// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { NarrativeBlock } from './NarrativeBlock'

describe('NarrativeBlock', () => {
  it('renders text content', () => {
    render(<NarrativeBlock content="A fearless warrior of renown." />)
    expect(screen.getByText('A fearless warrior of renown.')).toBeTruthy()
  })

  it('renders empty string without error', () => {
    const { container } = render(<NarrativeBlock content="" />)
    expect(container.firstChild).toBeTruthy()
  })
})
