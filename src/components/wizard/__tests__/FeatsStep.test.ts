import { describe, it, expect } from 'vitest'
import type { Value } from '../../../lib/types'
import { getPropertyString } from '../../../lib/properties'

describe('FeatsStep pure logic', () => {
  it('getPropertyString extracts feat properties', () => {
    const props: Record<string, Value> = {
      name: 'Alertness',
      benefit: 'Bonus to Initiative and Perception',
    }
    expect(getPropertyString(props, 'name', '')).toBe('Alertness')
    expect(getPropertyString(props, 'benefit', '')).toBe('Bonus to Initiative and Perception')
  })

  it('getPropertyString falls back gracefully', () => {
    const props: Record<string, Value> = {}
    expect(getPropertyString(props, 'name', 'Unknown feat')).toBe('Unknown feat')
    expect(getPropertyString(props, 'benefit', 'No description')).toBe('No description')
  })
})
