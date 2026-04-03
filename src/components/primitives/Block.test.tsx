// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Block } from './Block'

describe('Block', () => {
  it('renders title', () => {
    render(<Block title="Ability Scores"><span>content</span></Block>)
    expect(screen.getByText('Ability Scores')).toBeTruthy()
  })

  it('renders children', () => {
    render(<Block><span>child content</span></Block>)
    expect(screen.getByText('child content')).toBeTruthy()
  })

  it('omits title element when not provided', () => {
    const { container } = render(<Block><span>x</span></Block>)
    expect(container.querySelector('h3')).toBeNull()
  })
})
