import { useState, useCallback } from 'react'
import { ALL_SKILLS } from '../../../lib/dnd35/skills'

export function useSkillAllocation() {
  const [skillAllocations, setSkillAllocations] = useState<Record<string, number>>({})
  const [skillPointsRemaining, setSkillPointsRemaining] = useState(0)
  const [classSkillNames, setClassSkillNames] = useState<string[]>([])

  const calculateSkillCost = useCallback(
    (skillName: string): number => {
      const skill = ALL_SKILLS.find(
        (s) => s.name.toLowerCase() === skillName.toLowerCase()
      )
      if (!skill) return 2
      const isClassSkill = classSkillNames.some(
        (cs) => cs.toLowerCase() === skillName.toLowerCase()
      )
      return isClassSkill ? 1 : 2
    },
    [classSkillNames]
  )

  const handleAllocateSkill = useCallback(
    (
      skillName: string,
      delta: number,
      currentAllocations: Record<string, number>,
      currentRemaining: number
    ): { newAllocations: Record<string, number>; newRemaining: number } | null => {
      const cost = calculateSkillCost(skillName)
      const currentRanks = currentAllocations[skillName] || 0
      const newRanks = Math.max(0, currentRanks + delta)

      if (newRanks < 0) return null

      // Estimate total cost
      let totalEstimate = 0
      for (const [s, ranks] of Object.entries(currentAllocations)) {
        if (s === skillName) continue
        const sCost = calculateSkillCost(s)
        totalEstimate += ranks * sCost
      }
      totalEstimate += newRanks * cost

      if (totalEstimate > currentRemaining && delta > 0) return null

      const newAllocations = { ...currentAllocations, [skillName]: newRanks }
      const newRemaining = currentRemaining - delta * cost

      return { newAllocations, newRemaining }
    },
    [calculateSkillCost]
  )

  return {
    skillAllocations,
    skillPointsRemaining,
    classSkillNames,
    setSkillAllocations,
    setSkillPointsRemaining,
    setClassSkillNames,
    handleAllocateSkill,
    calculateSkillCost,
  }
}
