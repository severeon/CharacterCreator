// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'

afterEach(cleanup)
import { KeyValue } from './KeyValue'

describe('KeyValue', () => {
  describe('row layout (default)', () => {
    it('renders label and value', () => {
      render(<KeyValue label="Key Ability" value="Dexterity" />)
      expect(screen.getByText('Key Ability')).toBeDefined()
      expect(screen.getByText('Dexterity')).toBeDefined()
    })

    it('renders as a div', () => {
      const { container } = render(<KeyValue label="L" value="V" />)
      expect(container.firstChild?.nodeName).toBe('DIV')
    })

    it('label has fixed width class', () => {
      render(<KeyValue label="Key Ability" value="Dex" />)
      const label = screen.getByText('Key Ability')
      expect(label.className).toContain('w-40')
    })
  })

  describe('inline layout', () => {
    it('renders label and value inline', () => {
      render(<KeyValue label="HD" value="d8" layout="inline" />)
      expect(screen.getByText('HD')).toBeDefined()
      expect(screen.getByText('d8')).toBeDefined()
    })

    it('renders as a span', () => {
      const { container } = render(<KeyValue label="L" value="V" layout="inline" />)
      expect(container.firstChild?.nodeName).toBe('SPAN')
    })
  })

  describe('block layout', () => {
    it('renders label and value', () => {
      render(<KeyValue label="School" value="Conjuration" layout="block" />)
      expect(screen.getByText('School')).toBeDefined()
      expect(screen.getByText('Conjuration')).toBeDefined()
    })

    it('label has block class', () => {
      render(<KeyValue label="School" value="Conjuration" layout="block" />)
      const label = screen.getByText('School')
      expect(label.className).toContain('block')
    })
  })

  it('accepts ReactNode as value', () => {
    render(<KeyValue label="Tags" value={<span data-testid="tag">Fire</span>} />)
    expect(screen.getByTestId('tag')).toBeDefined()
  })
})
