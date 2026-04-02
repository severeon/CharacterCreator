import { describe, it, expect } from 'vitest'
import { POINT_BUY_COST } from '../../../lib/dnd35/constants'

import { babTable } from '../../reference/babTable'

describe('AbilitiesStep pure logic', () => {
  function abilityModifier(score: number): number {
    return Math.floor((score - 10) / 2)
  }

  it('abilityModifier returns correct values', () => {
    expect(abilityModifier(10)).toBe(0)
    expect(abilityModifier(12)).toBe(1)
    expect(abilityModifier(8)).toBe(-1)
    expect(abilityModifier(20)).toBe(5)
    expect(abilityModifier(1)).toBe(-5)
    expect(abilityModifier(15)).toBe(2)
    expect(abilityModifier(13)).toBe(1)
  })

  it('POINT_BUY_COST has correct values', () => {
    expect(POINT_BUY_COST[8]).toBe(0)
    expect(POINT_BUY_COST[9]).toBe(1)
    expect(POINT_BUY_COST[10]).toBe(2)
    expect(POINT_BUY_COST[11]).toBe(3)
    expect(POINT_BUY_COST[12]).toBe(4)
    expect(POINT_BUY_COST[13]).toBe(5)
    expect(POINT_BUY_COST[14]).toBe(7)
    expect(POINT_BUY_COST[15]).toBe(9)
    expect(POINT_BUY_COST[16]).toBe(12)
    expect(POINT_BUY_COST[17]).toBe(15)
    expect(POINT_BUY_COST[18]).toBe(19)
  })

  it('BAB table has correct level 1 values', () => {
    expect(babTable['full'][0]).toBe(1)
    expect(babTable['medium'][0]).toBe(0)
    expect(babTable['poor'][0]).toBe(0)
  })
})
