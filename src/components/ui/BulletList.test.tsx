// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'

afterEach(cleanup)
import { BulletList } from './BulletList'

describe('BulletList', () => {
  it('renders string items', () => {
    render(<BulletList items={['Darkvision', 'Low-light vision']} />)
    expect(screen.getByText('Darkvision')).toBeDefined()
    expect(screen.getByText('Low-light vision')).toBeDefined()
  })

  it('renders as a ul', () => {
    const { container } = render(<BulletList items={['a']} />)
    expect(container.firstChild?.nodeName).toBe('UL')
  })

  it('uses normal spacing by default', () => {
    const { container } = render(<BulletList items={['a']} />)
    expect((container.firstChild as HTMLElement).className).toContain('space-y-1')
  })

  it('uses tight spacing when specified', () => {
    const { container } = render(<BulletList items={['a']} spacing="tight" />)
    expect((container.firstChild as HTMLElement).className).toContain('space-y-0.5')
  })

  it('uses custom renderItem', () => {
    render(
      <BulletList
        items={[{ name: 'Size', desc: 'Medium' }]}
        renderItem={(t) => <><b>{t.name}</b>: {t.desc}</>}
      />
    )
    expect(screen.getByText('Size')).toBeDefined()
    expect(screen.getByText(': Medium')).toBeDefined()
  })

  it('renders empty list without error', () => {
    const { container } = render(<BulletList items={[]} />)
    expect(container.querySelectorAll('li').length).toBe(0)
  })
})
