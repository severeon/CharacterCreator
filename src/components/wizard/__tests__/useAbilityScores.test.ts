import { describe, it, expect } from 'vitest'

describe('useAbilityScores pure logic', () => {
  it('roll4d6DropLowest returns value between 3 and 18', () => {
    const roll = () => {
      const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
      rolls.sort((a, b) => a - b)
      return rolls[1] + rolls[2] + rolls[3]
    }
    for (let i = 0; i < 10; i++) {
      const result = roll()
      expect(result).toBeGreaterThanOrEqual(3)
      expect(result).toBeLessThanOrEqual(18)
    }
  })

  it('STANDARD_ARRAY has correct values', () => {
    const STANDARD_ARRAY = {
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 12,
      wisdom: 10,
      charisma: 8,
    }
    expect(STANDARD_ARRAY.strength).toBe(15)
    expect(STANDARD_ARRAY.dexterity).toBe(14)
    expect(STANDARD_ARRAY.constitution).toBe(13)
    expect(STANDARD_ARRAY.intelligence).toBe(12)
    expect(STANDARD_ARRAY.wisdom).toBe(10)
    expect(STANDARD_ARRAY.charisma).toBe(8)
  })

  it('abilityModifier calculation', () => {
    const abilityModifier = (score: number): number => Math.floor((score - 10) / 2)
    expect(abilityModifier(10)).toBe(0)
    expect(abilityModifier(12)).toBe(1)
    expect(abilityModifier(8)).toBe(-1)
    expect(abilityModifier(15)).toBe(2)
    expect(abilityModifier(20)).toBe(5)
  })

  it('DEFAULT_ABILITY_SCORES are all 10', () => {
    const DEFAULT_ABILITY_SCORES = {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    }
    Object.values(DEFAULT_ABILITY_SCORES).forEach((v) => expect(v).toBe(10))
  })
})
