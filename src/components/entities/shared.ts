import type { Value } from '../../lib/types'

// Narrows a Value to a plain object (excludes arrays and null).
export function isObject(v: Value): v is Record<string, Value> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

// D&D 3.5e ability score keys in display order.
export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
export type AbilityKey = typeof ABILITY_KEYS[number]

// Display name for ability keys.
export const ABILITY_LABELS: Record<string, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
}
