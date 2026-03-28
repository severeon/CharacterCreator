import { useState } from 'react'
import type { Entity } from '../../../lib/types'

export function useFeatSelection() {
  const [selectedFeats, setSelectedFeats] = useState<string[]>([])
  const [featSlotsRemaining, setFeatSlotsRemaining] = useState(1)

  const handleSelectFeat = (feat: Entity) => {
    if (featSlotsRemaining <= 0) return
    setSelectedFeats((prev) => [...prev, feat.id])
    setFeatSlotsRemaining((prev) => prev - 1)
  }

  return {
    selectedFeats,
    featSlotsRemaining,
    setSelectedFeats,
    setFeatSlotsRemaining,
    handleSelectFeat,
  }
}
