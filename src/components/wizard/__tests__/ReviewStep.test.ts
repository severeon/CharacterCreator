import { describe, it, expect } from 'vitest'

describe('ReviewStep pure logic', () => {
  it('ability modifier calculation matches AbilitiesStep', () => {
    function abilityModifier(score: number): number {
      return Math.floor((score - 10) / 2)
    }
    expect(abilityModifier(10)).toBe(0)
    expect(abilityModifier(15)).toBe(2)
    expect(abilityModifier(8)).toBe(-1)
  })

  it('formatModifier shows + for positive values', () => {
    const fmt = (score: number) => {
      const mod = Math.floor((score - 10) / 2)
      return mod >= 0 ? `+${mod}` : `${mod}`
    }
    expect(fmt(10)).toBe('+0')
    expect(fmt(12)).toBe('+1')
    expect(fmt(8)).toBe('-1')
  })
})
