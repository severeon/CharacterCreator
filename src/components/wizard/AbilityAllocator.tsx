import { RollAbilitiesStep } from './RollAbilitiesStep'
import { AssignAbilitiesStep } from './AssignAbilitiesStep'
import type { Entity } from '../../lib/types'

interface AbilityAllocatorProps {
  config: { mode: 'generate' | 'assign'; show_racial_bonuses?: boolean }
  rolledSets: number[][]
  abilityMethod: 'manual' | 'array' | 'roll' | 'pointbuy'
  pointBuyRemaining: number
  abilities: Record<string, number>
  selectedClass: Entity | null
  onRollAbilities: () => void
  onStandardArray: () => void
  onPointBuy: () => void
  onManualEntry: () => void
  onAbilityPointBuy: (ability: string, delta: number) => void
  onAbilityManualChange: (ability: string, value: number) => void
}

export function AbilityAllocator({
  config,
  rolledSets,
  abilityMethod,
  pointBuyRemaining,
  abilities,
  selectedClass,
  onRollAbilities,
  onStandardArray,
  onPointBuy,
  onManualEntry,
  onAbilityPointBuy,
  onAbilityManualChange,
}: AbilityAllocatorProps) {
  if (config.mode === 'generate') {
    return (
      <RollAbilitiesStep
        rolledSets={rolledSets}
        abilityMethod={abilityMethod}
        onRollAbilities={onRollAbilities}
        onStandardArray={onStandardArray}
        onPointBuy={onPointBuy}
        onManualEntry={onManualEntry}
      />
    )
  }

  return (
    <AssignAbilitiesStep
      abilities={abilities}
      abilityMethod={abilityMethod}
      pointBuyRemaining={pointBuyRemaining}
      selectedClass={selectedClass}
      onRollAbilities={onRollAbilities}
      onStandardArray={onStandardArray}
      onPointBuy={onPointBuy}
      onManualEntry={onManualEntry}
      onAbilityPointBuy={onAbilityPointBuy}
      onAbilityManualChange={onAbilityManualChange}
    />
  )
}
