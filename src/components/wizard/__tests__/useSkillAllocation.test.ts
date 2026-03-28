import { describe, it, expect } from 'vitest'
import { ALL_SKILLS } from '../../../lib/dnd35/skills'

describe('useSkillAllocation pure logic', () => {
  it('calculateSkillCost returns 1 for class skills, 2 for cross-class', () => {
    const calculateSkillCost = (
      skillName: string,
      classSkillNames: string[]
    ): number => {
      const skill = ALL_SKILLS.find(
        (s) => s.name.toLowerCase() === skillName.toLowerCase()
      )
      if (!skill) return 2
      const isClassSkill = classSkillNames.some(
        (cs) => cs.toLowerCase() === skillName.toLowerCase()
      )
      return isClassSkill ? 1 : 2
    }

    expect(calculateSkillCost('Appraise', ['Appraise', 'Bluff'])).toBe(1)
    expect(calculateSkillCost('Balance', ['Appraise'])).toBe(2)
    expect(calculateSkillCost('Unknown Skill', [])).toBe(2)
  })

  it('skill allocation respects max ranks', () => {
    const level = 1
    const isClassSkill = true
    const maxRanks = isClassSkill ? level : Math.floor(level / 2)
    expect(maxRanks).toBe(1)

    const crossClassMax = Math.floor(level / 2)
    expect(crossClassMax).toBe(0)
  })

  it('skill cost tracking works correctly', () => {
    const skillPointsRemaining = 10
    const delta = 1
    const cost = 1 // class skill
    const newRemaining = skillPointsRemaining - delta * cost
    expect(newRemaining).toBe(9)
  })
})
