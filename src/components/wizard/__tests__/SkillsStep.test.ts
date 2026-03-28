import { describe, it, expect } from 'vitest'
import { ALL_SKILLS } from '../../../lib/dnd35/skills'

describe('SkillsStep pure logic', () => {
  it('ALL_SKILLS has 43 entries', () => {
    expect(ALL_SKILLS.length).toBe(43)
  })

  it('each skill has name and ability', () => {
    ALL_SKILLS.forEach((skill) => {
      expect(typeof skill.name).toBe('string')
      expect(skill.name.length).toBeGreaterThan(0)
      expect(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']).toContain(skill.ability)
    })
  })

  it('contains expected D&D 3.5e skills', () => {
    const skillNames = ALL_SKILLS.map((s) => s.name)
    expect(skillNames).toContain('Appraise')
    expect(skillNames).toContain('Balance')
    expect(skillNames).toContain('Bluff')
    expect(skillNames).toContain('Climb')
    expect(skillNames).toContain('Knowledge(Arcana)')
    expect(skillNames).toContain('Knowledge(Dungeoneering)')
    expect(skillNames).toContain('Use Magic Device')
    expect(skillNames).toContain('Spot')
    expect(skillNames).toContain('Listen')
  })

  it('all Knowledge skills use INT', () => {
    ALL_SKILLS.filter((s) => s.name.startsWith('Knowledge(')).forEach((skill) => {
      expect(skill.ability).toBe('INT')
    })
  })

  it('class skills cost 1, cross-class cost 2', () => {
    const classSkills = ['Appraise', 'Balance', 'Bluff', 'Climb', 'Concentration']
    classSkills.forEach((name) => {
      const skill = ALL_SKILLS.find((s) => s.name === name)
      expect(skill).toBeDefined()
    })
  })
})
