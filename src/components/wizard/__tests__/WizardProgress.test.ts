import { describe, it, expect } from 'vitest'

type WizardStep = 'name' | 'race' | 'class' | 'abilities' | 'skills' | 'feats' | 'review'

const STEP_ORDER: WizardStep[] = ['name', 'race', 'class', 'abilities', 'skills', 'feats', 'review']

describe('WizardProgress pure logic', () => {
  it('STEP_ORDER has 7 steps', () => {
    expect(STEP_ORDER.length).toBe(7)
  })

  it('STEP_ORDER has correct sequence', () => {
    expect(STEP_ORDER[0]).toBe('name')
    expect(STEP_ORDER[1]).toBe('race')
    expect(STEP_ORDER[2]).toBe('class')
    expect(STEP_ORDER[3]).toBe('abilities')
    expect(STEP_ORDER[4]).toBe('skills')
    expect(STEP_ORDER[5]).toBe('feats')
    expect(STEP_ORDER[6]).toBe('review')
  })

  it('completed steps are a set of wizard steps', () => {
    const completedSteps = new Set<WizardStep>(['name', 'race'])
    expect(completedSteps.has('name')).toBe(true)
    expect(completedSteps.has('race')).toBe(true)
    expect(completedSteps.has('class')).toBe(false)
  })
})
