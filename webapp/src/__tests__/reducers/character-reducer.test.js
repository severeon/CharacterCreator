import { describe, it, expect } from 'vitest'
import { characterReducer, INITIAL_CHARACTER_STATE } from '@/context/CharacterContext.js'

describe('characterReducer — initial state', () => {
  it('has all top-level keys from legacy S', () => {
    expect(INITIAL_CHARACTER_STATE).toMatchObject({
      charName: '', playerName: '', alignment: '', race: 'Human',
      templates: [], scores: { str:10, dex:10, con:10, int:10, wis:10, cha:10 },
      classLevels: 1, levelChoices: [{ classA: null, classB: null }],
      skillRanks: {}, featsByLevel: {}, invocations: []
    })
  })

  it('returns same state reference for unknown action', () => {
    const result = characterReducer(INITIAL_CHARACTER_STATE, { type: '__UNKNOWN__' })
    expect(result).toBe(INITIAL_CHARACTER_STATE)
  })
})

describe('characterReducer — SET_SCORE', () => {
  it('updates one stat without touching others', () => {
    const s = characterReducer(INITIAL_CHARACTER_STATE, { type:'SET_SCORE', payload:{ stat:'str', value:16 } })
    expect(s.scores.str).toBe(16)
    expect(s.scores.dex).toBe(10)
  })
})

describe('characterReducer — ADD_LEVEL / REMOVE_LEVEL', () => {
  it('ADD_LEVEL extends levelChoices, increments classLevels', () => {
    const s = characterReducer(INITIAL_CHARACTER_STATE, { type:'ADD_LEVEL' })
    expect(s.classLevels).toBe(2)
    expect(s.levelChoices).toHaveLength(2)
    expect(s.levelChoices[1]).toEqual({ classA:null, classB:null })
  })

  it('REMOVE_LEVEL respects minimum of 1', () => {
    const s = characterReducer(INITIAL_CHARACTER_STATE, { type:'REMOVE_LEVEL' })
    expect(s.classLevels).toBe(1)
    expect(s.levelChoices).toHaveLength(1)
  })

  it('REMOVE_LEVEL allows 0 when rhdChoices is non-empty', () => {
    const base = { ...INITIAL_CHARACTER_STATE, rhdChoices: [{}] }
    const s = characterReducer(base, { type:'REMOVE_LEVEL' })
    expect(s.classLevels).toBe(0)
    expect(s.levelChoices).toHaveLength(0)
  })

  it('ADD_LEVEL caps at 20', () => {
    let s = INITIAL_CHARACTER_STATE
    for (let i = 0; i < 25; i++) s = characterReducer(s, { type:'ADD_LEVEL' })
    expect(s.classLevels).toBe(20)
    expect(s.levelChoices).toHaveLength(20)
  })

  it('existing levelChoices entries are preserved on ADD_LEVEL', () => {
    const base = { ...INITIAL_CHARACTER_STATE, levelChoices: [{ classA:'Fighter', classB:'Wizard' }] }
    const s = characterReducer(base, { type:'ADD_LEVEL' })
    expect(s.levelChoices[0]).toEqual({ classA:'Fighter', classB:'Wizard' })
    expect(s.levelChoices[1]).toEqual({ classA:null, classB:null })
  })
})

describe('characterReducer — SET_SKILL_RANK', () => {
  it('adds a skill rank', () => {
    const s = characterReducer(INITIAL_CHARACTER_STATE, { type:'SET_SKILL_RANK', payload:{ skill:'Climb', ranks:4 } })
    expect(s.skillRanks['Climb']).toBe(4)
  })
  it('does not mutate other skills', () => {
    const base = { ...INITIAL_CHARACTER_STATE, skillRanks:{ Climb:4, Jump:2 } }
    const s = characterReducer(base, { type:'SET_SKILL_RANK', payload:{ skill:'Climb', ranks:6 } })
    expect(s.skillRanks['Jump']).toBe(2)
  })
})

describe('characterReducer — ADD_FEAT / REMOVE_FEAT', () => {
  it('ADD_FEAT stores feat name under slotId', () => {
    const s = characterReducer(INITIAL_CHARACTER_STATE, { type:'ADD_FEAT', payload:{ slotId:'lvl1_0', featName:'Power Attack' } })
    expect(s.featsByLevel['lvl1_0']).toBe('Power Attack')
  })
  it('REMOVE_FEAT sets slot to undefined', () => {
    const base = { ...INITIAL_CHARACTER_STATE, featsByLevel:{ 'lvl1_0':'Power Attack' } }
    const s = characterReducer(base, { type:'REMOVE_FEAT', payload:{ slotId:'lvl1_0' } })
    expect(s.featsByLevel['lvl1_0']).toBeUndefined()
  })
})

describe('characterReducer — identity/physical actions', () => {
  it('SET_NAME sets charName', () => {
    const s = characterReducer(INITIAL_CHARACTER_STATE, { type:'SET_NAME', payload:{ field:'charName', value:'Thorgrim' } })
    expect(s.charName).toBe('Thorgrim')
    expect(s.playerName).toBe('')
  })
  it('SET_ALIGNMENT sets alignment', () => {
    const s = characterReducer(INITIAL_CHARACTER_STATE, { type:'SET_ALIGNMENT', payload:'Chaotic Good' })
    expect(s.alignment).toBe('Chaotic Good')
  })
  it('SET_RACE sets race', () => {
    const s = characterReducer(INITIAL_CHARACTER_STATE, { type:'SET_RACE', payload:'Elf' })
    expect(s.race).toBe('Elf')
  })
  it('SET_PHYSICAL sets a physical field', () => {
    const s = characterReducer(INITIAL_CHARACTER_STATE, { type:'SET_PHYSICAL', payload:{ field:'eyes', value:'Blue' } })
    expect(s.eyes).toBe('Blue')
  })
})
