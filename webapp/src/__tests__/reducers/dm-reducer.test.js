import { describe, it, expect } from 'vitest'
import { dmReducer, INITIAL_DM_STATE } from '@/context/DmContext.js'

describe('dmReducer — initial state', () => {
  it('has all top-level keys from legacy DM', () => {
    expect(INITIAL_DM_STATE).toMatchObject({
      abMethod:'manual', pbPoints:25, enforceMaxBase:true, gestaltEnabled:true,
      allowTemplates:true, allowHighLA:true, allowRacialHD:true, maxECL:40,
      notes:'', dmPassword:'', enforcePrereqs:true, enforcePrCPrereqs:true
    })
  })
  it('disabled lists are arrays (not Sets)', () => {
    for (const k of ['disabledRaces','disabledClasses','disabledFeats','disabledTemplates','disabledSpells','disabledPowers'])
      expect(Array.isArray(INITIAL_DM_STATE[k])).toBe(true)
  })
  it('returns same state for unknown action', () => {
    expect(dmReducer(INITIAL_DM_STATE, { type:'__UNKNOWN__' })).toBe(INITIAL_DM_STATE)
  })
})

describe('dmReducer — SET_AB_METHOD', () => {
  it('changes abMethod', () => {
    expect(dmReducer(INITIAL_DM_STATE, { type:'SET_AB_METHOD', payload:'pointBuy' }).abMethod).toBe('pointBuy')
  })
})

describe('dmReducer — SET_PB_POINTS', () => {
  it('changes pbPoints', () => {
    expect(dmReducer(INITIAL_DM_STATE, { type:'SET_PB_POINTS', payload:28 }).pbPoints).toBe(28)
  })
})

describe('dmReducer — TOGGLE_CONTENT', () => {
  it('adds item when not present', () => {
    const s = dmReducer(INITIAL_DM_STATE, { type:'TOGGLE_CONTENT', payload:{ list:'disabledClasses', item:'Monk' } })
    expect(s.disabledClasses).toContain('Monk')
  })
  it('removes item when present', () => {
    const base = { ...INITIAL_DM_STATE, disabledClasses:['Monk','Druid'] }
    const s = dmReducer(base, { type:'TOGGLE_CONTENT', payload:{ list:'disabledClasses', item:'Monk' } })
    expect(s.disabledClasses).not.toContain('Monk')
    expect(s.disabledClasses).toContain('Druid')
  })
  it('works for all six lists', () => {
    for (const list of ['disabledRaces','disabledClasses','disabledFeats','disabledTemplates','disabledSpells','disabledPowers']) {
      const s = dmReducer(INITIAL_DM_STATE, { type:'TOGGLE_CONTENT', payload:{ list, item:'X' } })
      expect(s[list]).toContain('X')
    }
  })
})

describe('dmReducer — SET_LOCKED', () => {
  it('sets dmPassword when locking', () => {
    expect(dmReducer(INITIAL_DM_STATE, { type:'SET_LOCKED', payload:{ locked:true, password:'secret' } }).dmPassword).toBe('secret')
  })
  it('clears dmPassword when no password provided', () => {
    const locked = { ...INITIAL_DM_STATE, dmPassword:'secret' }
    expect(dmReducer(locked, { type:'SET_LOCKED', payload:{ locked:false } }).dmPassword).toBe('')
  })
})

describe('dmReducer — SET_CAMPAIGN', () => {
  it('merges known keys into DM state', () => {
    const s = dmReducer(INITIAL_DM_STATE, { type:'SET_CAMPAIGN', payload:{ abMethod:'4d6', pbPoints:32, maxECL:20 } })
    expect(s.abMethod).toBe('4d6')
    expect(s.pbPoints).toBe(32)
    expect(s.gestaltEnabled).toBe(true)
  })
  it('ignores unknown keys', () => {
    const s = dmReducer(INITIAL_DM_STATE, { type:'SET_CAMPAIGN', payload:{ abMethod:'standard', __evil:'injected' } })
    expect(s).not.toHaveProperty('__evil')
  })
})
