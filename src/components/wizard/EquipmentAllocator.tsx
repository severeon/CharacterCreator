import type { Entity } from '../../lib/types'
import { EquipmentStep } from './EquipmentStep'

interface EquipmentAllocatorProps {
  config: { starting_gold_ref: string }
  startingGold: number
  selectedClass: Entity | null
  selectedRace: Entity | null
}

export function EquipmentAllocator({ startingGold, selectedClass, selectedRace }: EquipmentAllocatorProps) {
  return (
    <EquipmentStep
      startingGold={startingGold}
      selectedClass={selectedClass}
      selectedRace={selectedRace}
      onContinue={() => {}}
      onBack={() => {}}
    />
  )
}
