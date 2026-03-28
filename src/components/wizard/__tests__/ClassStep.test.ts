import { describe, it, expect } from 'vitest'
import type { Entity, Value } from '../../../lib/types'
import { getPropertyString, getPropertyNumber } from '../../../lib/properties'

describe('ClassStep helpers', () => {
  it('getPropertyString extracts class properties', () => {
    const mockClass: Entity = {
      id: 'fighter',
      entity_type: 'class',
      properties: { name: 'Fighter', hd: 10, bab: 'good' } as Record<string, Value>,
      tags: [],
      mdx_body: '',
      source_pack: 'srd',
    }
    expect(getPropertyString(mockClass.properties, 'name', '')).toBe('Fighter')
    expect(getPropertyString(mockClass.properties, 'bab', 'med')).toBe('good')
  })

  it('getPropertyNumber extracts hit die', () => {
    const mockClass: Entity = {
      id: 'wizard',
      entity_type: 'class',
      properties: { name: 'Wizard', hd: 4, bab: 'medium' } as Record<string, Value>,
      tags: [],
      mdx_body: '',
      source_pack: 'srd',
    }
    expect(getPropertyNumber(mockClass.properties, 'hd', 8)).toBe(4)
  })

  it('getPropertyNumber falls back correctly', () => {
    const props: Record<string, Value> = {}
    expect(getPropertyNumber(props, 'hd', 8)).toBe(8)
  })
})
