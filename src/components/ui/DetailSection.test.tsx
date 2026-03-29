// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'

afterEach(cleanup)
import { DetailSection } from './DetailSection'

describe('DetailSection', () => {
  it('renders title as h3', () => {
    render(<DetailSection title="Class Skills">content</DetailSection>)
    const h3 = screen.getByRole('heading', { level: 3 })
    expect(h3.textContent).toBe('Class Skills')
  })

  it('renders children', () => {
    render(<DetailSection title="Traits"><p>Some trait</p></DetailSection>)
    expect(screen.getByText('Some trait')).toBeDefined()
  })

  it('wraps in a section element', () => {
    const { container } = render(<DetailSection title="T">content</DetailSection>)
    expect(container.firstChild?.nodeName).toBe('SECTION')
  })

  it('uses mb-2 for normal spacing (default)', () => {
    render(<DetailSection title="T">content</DetailSection>)
    const h3 = screen.getByRole('heading', { level: 3 })
    expect(h3.className).toContain('mb-2')
  })

  it('uses mb-1 for tight spacing', () => {
    render(<DetailSection title="T" spacing="tight">content</DetailSection>)
    const h3 = screen.getByRole('heading', { level: 3 })
    expect(h3.className).toContain('mb-1')
  })
})
