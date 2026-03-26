// webapp/src/__tests__/content-pack-loader.test.js
import { describe, it, expect, beforeAll } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { loadContentPacks } from '../lib/content-pack-loader.js'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TMP = join(import.meta.dirname, '__fixtures__/content-packs')

const RACE_MD = `---
type: race
name: Elf, High
category: Elves
la: 0
rhd: 0
rhdType: 8
bonuses:
  dex: 2
  con: -2
traits:
  - Low-light vision
  - Immune magic sleep
---
Optional flavor text.
`

const CLASS_MD = `---
type: class
name: Fighter
hd: 10
bab: full
fort: good
ref: poor
will: poor
skillPoints: 2
classSkills:
  - Climb
  - Jump
prestige: false
bonusFeats: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
bonusFeatList: fighter
---
`

const FEAT_MD = `---
type: feat
name: Power Attack
prereqs:
  bab: 1
  str: 13
---
Trade attack bonus for damage bonus.
`

const SPELL_MD = `---
type: spell
name: Fireball
school: Evocation
descriptor: Fire
classes:
  wizard: 3
  sorcerer: 3
castingTime: "1 standard action"
savingThrow: Reflex half
spellResistance: true
---
`

const POWER_MD = `---
type: power
name: Mind Thrust
discipline: Telepathy
descriptor: Mind-Affecting
classes:
  psion: 1
  wilder: 1
powerPoints: 1
augment: true
---
`

const CAMPAIGN_MD = `---
type: campaign
name: Test Campaign
abilityScoreMethod: pointBuy
pointBuyBudget: 28
allowedSources:
  - core
disabledClasses: []
---
`

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(() => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(join(TMP, 'races'), { recursive: true })
  mkdirSync(join(TMP, 'classes'), { recursive: true })
  mkdirSync(join(TMP, 'feats'), { recursive: true })
  mkdirSync(join(TMP, 'spells'), { recursive: true })
  mkdirSync(join(TMP, 'campaigns'), { recursive: true })
  writeFileSync(join(TMP, 'races/elf-high.md'), RACE_MD)
  writeFileSync(join(TMP, 'classes/fighter.md'), CLASS_MD)
  writeFileSync(join(TMP, 'feats/power-attack.md'), FEAT_MD)
  writeFileSync(join(TMP, 'spells/fireball.md'), SPELL_MD)
  writeFileSync(join(TMP, 'spells/mind-thrust.md'), POWER_MD)
  writeFileSync(join(TMP, 'campaigns/test-campaign.md'), CAMPAIGN_MD)
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('loadContentPacks', () => {
  it('returns a ContentPack with all entity arrays', async () => {
    const pack = await loadContentPacks(TMP)
    expect(pack).toHaveProperty('races')
    expect(pack).toHaveProperty('classes')
    expect(pack).toHaveProperty('feats')
    expect(pack).toHaveProperty('spells')
    expect(pack).toHaveProperty('powers')
    expect(pack).toHaveProperty('invocations')
    expect(pack).toHaveProperty('campaigns')
  })

  it('parses a race correctly', async () => {
    const { races } = await loadContentPacks(TMP)
    expect(races).toHaveLength(1)
    const elf = races[0]
    expect(elf.name).toBe('Elf, High')
    expect(elf.category).toBe('Elves')
    expect(elf.la).toBe(0)
    expect(elf.bonuses.dex).toBe(2)
    expect(elf.bonuses.con).toBe(-2)
    expect(elf.traits).toContain('Low-light vision')
  })

  it('parses a class correctly', async () => {
    const { classes } = await loadContentPacks(TMP)
    expect(classes).toHaveLength(1)
    const fighter = classes[0]
    expect(fighter.name).toBe('Fighter')
    expect(fighter.hd).toBe(10)
    expect(fighter.bab).toBe('full')
    expect(fighter.prestige).toBe(false)
    expect(fighter.bonusFeats).toContain(1)
    expect(fighter.classSkills).toContain('Climb')
  })

  it('parses a feat correctly', async () => {
    const { feats } = await loadContentPacks(TMP)
    expect(feats).toHaveLength(1)
    const feat = feats[0]
    expect(feat.name).toBe('Power Attack')
    expect(feat.prereqs.bab).toBe(1)
    expect(feat.prereqs.str).toBe(13)
  })

  it('separates spells from powers by type field', async () => {
    const { spells, powers } = await loadContentPacks(TMP)
    expect(spells).toHaveLength(1)
    expect(spells[0].name).toBe('Fireball')
    expect(powers).toHaveLength(1)
    expect(powers[0].name).toBe('Mind Thrust')
    expect(powers[0].powerPoints).toBe(1)
  })

  it('parses a campaign correctly', async () => {
    const { campaigns } = await loadContentPacks(TMP)
    expect(campaigns).toHaveLength(1)
    const campaign = campaigns[0]
    expect(campaign.name).toBe('Test Campaign')
    expect(campaign.abilityScoreMethod).toBe('pointBuy')
    expect(campaign.pointBuyBudget).toBe(28)
  })

  it('throws on unknown type field', async () => {
    writeFileSync(join(TMP, 'races/bad.md'), '---\ntype: banana\nname: Bad\n---\n')
    await expect(loadContentPacks(TMP)).rejects.toThrow(/unknown type/i)
    rmSync(join(TMP, 'races/bad.md'))
  })

  it('recurses into subdirectories', async () => {
    mkdirSync(join(TMP, 'races/subdir'), { recursive: true })
    writeFileSync(join(TMP, 'races/subdir/human.md'), `---\ntype: race\nname: Human\ncategory: Human Variants\nla: 0\nrhd: 0\nrhdType: 8\nbonuses: {}\ntraits:\n  - Bonus feat\n---\n`)
    const { races } = await loadContentPacks(TMP)
    expect(races.length).toBeGreaterThanOrEqual(2)
    rmSync(join(TMP, 'races/subdir'), { recursive: true })
  })
})
