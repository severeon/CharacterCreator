import { useEffect } from 'react'
import type { Theme } from '../lib/types'

export function useTheme(theme: Theme | null | undefined) {
  useEffect(() => {
    if (!theme) return

    const root = document.documentElement
    const { colors, typography, spacing } = theme.properties

    if (colors) {
      for (const [key, value] of Object.entries(colors)) {
        if (value) root.style.setProperty(`--color-${key.replace(/_/g, '-')}`, value)
      }
    }

    if (typography) {
      if (typography.heading_font) root.style.setProperty('--font-heading', typography.heading_font)
      if (typography.body_font) root.style.setProperty('--font-body', typography.body_font)
      if (typography.mono_font) root.style.setProperty('--font-mono', typography.mono_font)
    }

    if (spacing) {
      for (const [key, value] of Object.entries(spacing)) {
        if (value != null) {
          root.style.setProperty(`--spacing-${key.replace(/_/g, '-')}`, `${value}px`)
        }
      }
    }
  }, [theme])
}
