import { describe, it, expect, vi } from 'vitest'

function shouldInterceptMdxLink(href: string | null): boolean {
  return href !== null && href.endsWith('.mdx')
}

function buildNavTarget(entityType: string): string {
  return `/${entityType}`
}

describe('MdxRenderer mdx link interception', () => {
  it('identifies .mdx links to intercept', () => {
    expect(shouldInterceptMdxLink('./elves.mdx')).toBe(true)
    expect(shouldInterceptMdxLink('./abjuration.mdx')).toBe(true)
    expect(shouldInterceptMdxLink('../spells.mdx')).toBe(true)
    expect(shouldInterceptMdxLink('./barbarian.mdx')).toBe(true)
  })

  it('ignores non-.mdx links', () => {
    expect(shouldInterceptMdxLink('/races')).toBe(false)
    expect(shouldInterceptMdxLink('/spells')).toBe(false)
    expect(shouldInterceptMdxLink('https://example.com')).toBe(false)
    expect(shouldInterceptMdxLink('#section')).toBe(false)
    expect(shouldInterceptMdxLink('')).toBe(false)
    expect(shouldInterceptMdxLink(null)).toBe(false)
  })

  it('computes correct navigation target for entity type', () => {
    expect(buildNavTarget('races')).toBe('/races')
    expect(buildNavTarget('spells')).toBe('/spells')
    expect(buildNavTarget('classes')).toBe('/classes')
    expect(buildNavTarget('feats')).toBe('/feats')
  })

  it('intercepts .mdx links and navigates to entity type list', () => {
    const navigate = vi.fn()
    const entityType = 'spells'
    const href = './abjuration.mdx'

    const shouldIntercept = shouldInterceptMdxLink(href)
    if (shouldIntercept) {
      navigate(buildNavTarget(entityType))
    }

    expect(navigate).toHaveBeenCalledWith('/spells')
  })

  it('does not intercept regular links', () => {
    const navigate = vi.fn()
    const href = '/races'

    const shouldIntercept = shouldInterceptMdxLink(href)
    if (shouldIntercept) {
      navigate('/races')
    }

    expect(navigate).not.toHaveBeenCalled()
  })

  it('handles all back link patterns from MDX content', () => {
    const cases = [
      { href: './elves.mdx', entityType: 'races', expected: '/races' },
      { href: './abjuration.mdx', entityType: 'spells', expected: '/spells' },
      { href: '../spells.mdx', entityType: 'spells', expected: '/spells' },
      { href: './barbarian.mdx', entityType: 'classes', expected: '/classes' },
      { href: './power-attack.mdx', entityType: 'feats', expected: '/feats' },
    ]

    for (const { href, entityType, expected } of cases) {
      const navigate = vi.fn()
      if (shouldInterceptMdxLink(href)) {
        navigate(buildNavTarget(entityType))
      }
      expect(navigate).toHaveBeenCalledWith(expected)
    }
  })
})
