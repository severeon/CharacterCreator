import { describe, it, expect } from 'vitest'
import type { Entity, Value } from '../../../lib/types'
import { getPropertyString } from '../../../lib/properties'

describe('RaceStep helpers', () => {
  it('getPropertyString extracts name from entity properties', () => {
    const mockRace: Entity = {
      id: 'human',
      entity_type: 'race',
      properties: { name: 'Human', size: 'Medium', speed: '30 ft' } as Record<string, Value>,
      tags: [],
      mdx_body: '',
      source_pack: 'srd',
    }
    expect(getPropertyString(mockRace.properties, 'name', '')).toBe('Human')
    expect(getPropertyString(mockRace.properties, 'size', '')).toBe('Medium')
    expect(getPropertyString(mockRace.properties, 'speed', '')).toBe('30 ft')
  })

  it('getPropertyString falls back correctly', () => {
    const props: Record<string, Value> = {}
    expect(getPropertyString(props, 'name', 'Unknown')).toBe('Unknown')
    expect(getPropertyString(props, 'size', 'Medium')).toBe('Medium')
  })
})
