// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'

afterEach(cleanup)
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>+2 STR</Badge>)
    expect(screen.getByText('+2 STR')).toBeDefined()
  })

  it('defaults to gray variant', () => {
    const { container } = render(<Badge>Default</Badge>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('bg-gray-100')
    expect(el.className).toContain('text-gray-700')
  })

  it('applies amber variant classes', () => {
    const { container } = render(<Badge variant="amber">Amber</Badge>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('bg-amber-100')
    expect(el.className).toContain('text-amber-800')
  })

  it('applies blue variant classes', () => {
    const { container } = render(<Badge variant="blue">Blue</Badge>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('bg-blue-100')
    expect(el.className).toContain('text-blue-800')
  })

  it('applies purple variant classes', () => {
    const { container } = render(<Badge variant="purple">Purple</Badge>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('bg-purple-100')
    expect(el.className).toContain('text-purple-800')
  })

  it('renders as a span', () => {
    const { container } = render(<Badge>Test</Badge>)
    expect(container.firstChild?.nodeName).toBe('SPAN')
  })
})
