import { useState, useCallback } from 'react'
import { POINT_BUY_COST, POINT_BUY_BUDGET, STANDARD_ARRAY, DEFAULT_ABILITY_SCORES } from '../../../lib/dnd35/constants'

export type AbilityMethod = 'manual' | 'array' | 'roll' | 'pointbuy'

export function useAbilityScores() {
  const [abilities, setAbilities] = useState<Record<string, number>>(DEFAULT_ABILITY_SCORES)
  const [abilityMethod, setAbilityMethod] = useState<AbilityMethod>('manual')
  const [pointBuyRemaining, setPointBuyRemaining] = useState(POINT_BUY_BUDGET)

  const roll4d6DropLowest = useCallback((): number => {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
    rolls.sort((a, b) => a - b)
    return rolls[1] + rolls[2] + rolls[3]
  }, [])

  const handleRollAbilities = useCallback(() => {
    setAbilityMethod('roll')
    const abilities_order = [
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ]
    const newAbilities: Record<string, number> = {}
    const rolls = Array.from({ length: 6 }, () => roll4d6DropLowest())
    rolls
      .sort((a, b) => b - a)
      .forEach((roll, i) => {
        newAbilities[abilities_order[i]] = roll
      })
    setAbilities(newAbilities)
  }, [roll4d6DropLowest])

  const handleStandardArray = useCallback(() => {
    setAbilityMethod('array')
    setAbilities(STANDARD_ARRAY)
    setPointBuyRemaining(POINT_BUY_BUDGET)
  }, [])

  const handlePointBuy = useCallback(() => {
    setAbilityMethod('pointbuy')
    setPointBuyRemaining(POINT_BUY_BUDGET)
    setAbilities(DEFAULT_ABILITY_SCORES)
  }, [])

  const handleAbilityPointBuy = useCallback(
    (ability: string, delta: number) => {
      setAbilities((prev) => {
        const current = prev[ability] || 8
        const newValue = Math.max(8, Math.min(18, current + delta))
        if (newValue === current) return prev

        const oldCost = POINT_BUY_COST[current] || 0
        const newCost = POINT_BUY_COST[newValue] || 0
        const costDiff = newCost - oldCost

        if (costDiff > pointBuyRemaining && delta > 0) return prev

        setPointBuyRemaining((prevPb) => Math.max(0, prevPb - costDiff))
        return { ...prev, [ability]: newValue }
      })
    },
    [pointBuyRemaining]
  )

  const setAbilityManual = useCallback((newAbilities: Record<string, number>) => {
    setAbilityMethod('manual')
    setAbilities(newAbilities)
  }, [])

  const abilityModifier = useCallback((score: number): number => {
    return Math.floor((score - 10) / 2)
  }, [])

  return {
    abilities,
    abilityMethod,
    pointBuyRemaining,
    POINT_BUY_COST,
    roll4d6DropLowest,
    handleRollAbilities,
    handleStandardArray,
    handlePointBuy,
    handleAbilityPointBuy,
    setAbilityManual,
    abilityModifier,
  }
}
