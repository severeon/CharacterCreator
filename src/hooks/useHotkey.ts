import { useEffect } from 'react'

export function useHotkey(
  key: string,
  modifiers: { meta?: boolean; ctrl?: boolean },
  callback: () => void,
) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key !== key) return
      const needsMeta = modifiers.meta ?? false
      const needsCtrl = modifiers.ctrl ?? false
      if (needsMeta && !e.metaKey) return
      if (needsCtrl && !e.ctrlKey) return
      e.preventDefault()
      callback()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [key, modifiers.meta, modifiers.ctrl, callback])
}
