// webapp/src/__tests__/content-pack-round-trip.test.js
// Validates that content/ files round-trip correctly through the loader.
// Tests that generated data shape matches legacy JS constants.
import { describe, it, expect, beforeAll } from 'vitest'
import { join, dirname } from 'node:path'
import { loadContentPacks } from '../lib/content-pack-loader.js'

// import.meta.dirname = webapp/src/__tests__
// dirname(...)         = webapp/src
// ../../content        = CharacterCreator/content
const CONTENT_DIR = join(dirname(import.meta.dirname), '../../content')

let pack

beforeAll(async () => {
  pack = await loadContentPacks(CONTENT_DIR)
})

describe('round-trip: races', () => {
  it('loads at least 50 races', () => {
    expect(pack.races.length).toBeGreaterThanOrEqual(50)
  })

  it('every race has required fields', () => {
    for (const race of pack.races) {
      expect(race, `race "${race.name}" missing 'name'`).toHaveProperty('name')
      expect(race, `race "${race.name}" missing 'category'`).toHaveProperty('category')
      expect(typeof race.la, `race "${race.name}" la not a number`).toBe('number')
      expect(Array.isArray(race.traits), `race "${race.name}" traits not array`).toBe(true)
    }
  })

  it('Human is present with no ability score bonuses', () => {
    const human = pack.races.find(r => r.name === 'Human')
    expect(human).toBeDefined()
    // Human has no ability score bonuses (empty object)
    const bonuses = human.bonuses ?? {}
    const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha']
    const abilityBonuses = abilityKeys.filter(k => bonuses[k] !== undefined)
    expect(abilityBonuses).toHaveLength(0)
  })

  it('Drow (Dark Elf) has la: 2', () => {
    const drow = pack.races.find(r => r.name === 'Drow (Dark Elf)')
    expect(drow).toBeDefined()
    expect(drow.la).toBe(2)
  })
})

describe('round-trip: classes', () => {
  it('loads at least 15 base classes', () => {
    const base = pack.classes.filter(c => c.subtype !== 'prestige')
    expect(base.length).toBeGreaterThanOrEqual(15)
  })

  it('loads at least 10 prestige classes', () => {
    const prestige = pack.classes.filter(c => c.subtype === 'prestige')
    expect(prestige.length).toBeGreaterThanOrEqual(10)
  })

  it('Fighter has hd: 10, bab: full, 11 bonus feat levels', () => {
    const fighter = pack.classes.find(c => c.name === 'Fighter')
    expect(fighter).toBeDefined()
    expect(fighter.hd).toBe(10)
    expect(fighter.bab).toBe('full')
    expect(fighter.bonusFeats).toHaveLength(11)
  })

  it('Wizard has hd: 4, bab: poor', () => {
    // Legacy classes.js uses 'full', 'medium', 'poor' — not fractions
    const wizard = pack.classes.find(c => c.name === 'Wizard')
    expect(wizard).toBeDefined()
    expect(wizard.hd).toBe(4)
    expect(wizard.bab).toBe('poor')
  })
})

describe('round-trip: feats', () => {
  it('loads at least 100 feats', () => {
    expect(pack.feats.length).toBeGreaterThanOrEqual(100)
  })

  it('Cleave has Power Attack as a feat prereq and bab: 1', () => {
    // Power Attack itself has no prereqs in the source data
    // Cleave requires { bab: 1, feats: ["Power Attack"] }
    const feat = pack.feats.find(f => f.name === 'Cleave')
    expect(feat).toBeDefined()
    expect(feat.prereqs?.bab).toBe(1)
    expect(feat.prereqs?.feats).toContain('Power Attack')
  })

  it('Greater Cleave has both Cleave and Power Attack as feat prereqs', () => {
    const feat = pack.feats.find(f => f.name === 'Greater Cleave')
    expect(feat).toBeDefined()
    expect(feat.prereqs?.feats).toContain('Power Attack')
    expect(feat.prereqs?.feats).toContain('Cleave')
  })
})
