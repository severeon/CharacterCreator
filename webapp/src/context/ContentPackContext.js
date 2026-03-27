'use client'

import { createContext, useContext, createElement } from 'react'

const ContentPackContext = createContext(null)

/**
 * @param {{ pack: import('@/lib/content-pack-types.js').ContentPack, children: import('react').ReactNode }} props
 */
export function ContentPackProvider({ pack, children }) {
  return createElement(ContentPackContext.Provider, { value: pack }, children)
}

export function useContentPack() {
  const ctx = useContext(ContentPackContext)
  if (!ctx) throw new Error('useContentPack must be used within ContentPackProvider')
  return ctx
}
