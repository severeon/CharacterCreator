// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useTheme } from './useTheme'
import type { Theme } from '../lib/types'

const mockTheme: Theme = {
  id: 'srd:styling:theme',
  properties: {
    name: 'Test Theme',
    colors: {
      primary: '#1e40af',
      background: '#0f172a',
    },
    typography: {
      heading_font: 'Cinzel',
      body_font: 'Merriweather',
      mono_font: 'Fira Code',
    },
    spacing: {
      base_unit: 4,
      component_gap: 16,
    },
  },
}

describe('useTheme', () => {
  it('applies color CSS custom properties to document root', () => {
    renderHook(() => useTheme(mockTheme))
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#1e40af')
    expect(document.documentElement.style.getPropertyValue('--color-background')).toBe('#0f172a')
  })

  it('applies typography font properties', () => {
    renderHook(() => useTheme(mockTheme))
    expect(document.documentElement.style.getPropertyValue('--font-heading')).toBe('Cinzel')
    expect(document.documentElement.style.getPropertyValue('--font-mono')).toBe('Fira Code')
  })

  it('applies spacing properties with px unit', () => {
    renderHook(() => useTheme(mockTheme))
    expect(document.documentElement.style.getPropertyValue('--spacing-base-unit')).toBe('4px')
    expect(document.documentElement.style.getPropertyValue('--spacing-component-gap')).toBe('16px')
  })

  it('does not throw when theme is null', () => {
    expect(() => renderHook(() => useTheme(null))).not.toThrow()
  })
})
