import { useState } from 'react'
import type { Entity } from '../../../lib/types'

export function useClassSelection() {
  const [selectedClass, setSelectedClass] = useState<Entity | null>(null)
  const [selectedClassB, setSelectedClassB] = useState<Entity | null>(null)
  const [isGestalt, setIsGestalt] = useState(false)

  const handleSelectClass = (cls: Entity | null, slot: 'A' | 'B') => {
    if (slot === 'A') {
      setSelectedClass(cls)
    } else {
      setSelectedClassB(cls)
    }
  }

  const handleToggleGestalt = (value: boolean) => {
    setIsGestalt(value)
    if (!value) {
      setSelectedClassB(null)
    }
  }

  return {
    selectedClass,
    selectedClassB,
    isGestalt,
    setSelectedClass,
    setSelectedClassB,
    setIsGestalt: handleToggleGestalt,
    handleSelectClass,
  }
}
