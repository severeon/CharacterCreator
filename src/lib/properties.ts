import type { Value } from './types'

export function getPropertyString(
  properties: Record<string, Value>,
  key: string,
  fallback: string
): string {
  const val = properties[key]
  if (val === null || val === undefined) return fallback
  if (typeof val === 'string') return val
  if (typeof val === 'number') return val.toString()
  return fallback
}

export function getPropertyNumber(
  properties: Record<string, Value>,
  key: string,
  fallback: number
): number {
  const val = properties[key]
  if (typeof val === 'number') return val
  return fallback
}
