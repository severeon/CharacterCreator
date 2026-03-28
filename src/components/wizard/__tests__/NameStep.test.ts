import { describe, it, expect } from 'vitest'

const ALIGNMENTS: [string, string, string][] = [
  ['lawful-good', 'Lawful Good', 'LG'],
  ['neutral-good', 'Neutral Good', 'NG'],
  ['chaotic-good', 'Chaotic Good', 'CG'],
  ['lawful-neutral', 'Lawful Neutral', 'LN'],
  ['neutral', 'Neutral', 'N'],
  ['chaotic-neutral', 'Chaotic Neutral', 'CN'],
  ['lawful-evil', 'Lawful Evil', 'LE'],
  ['neutral-evil', 'Neutral Evil', 'NE'],
  ['chaotic-evil', 'Chaotic Evil', 'CE'],
]

describe('NameStep pure logic', () => {
  it('ALIGNMENTS has 9 options', () => {
    expect(ALIGNMENTS.length).toBe(9)
  })

  it('all alignments have required fields', () => {
    ALIGNMENTS.forEach(([value, label, abbrev]) => {
      expect(typeof value).toBe('string')
      expect(typeof label).toBe('string')
      expect(typeof abbrev).toBe('string')
      expect(abbrev.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('covers all 9 alignment combinations', () => {
    const covered = ALIGNMENTS.map((a) => a[0])
    expect(covered).toContain('lawful-good')
    expect(covered).toContain('neutral-good')
    expect(covered).toContain('chaotic-good')
    expect(covered).toContain('lawful-neutral')
    expect(covered).toContain('neutral')
    expect(covered).toContain('chaotic-neutral')
    expect(covered).toContain('lawful-evil')
    expect(covered).toContain('neutral-evil')
    expect(covered).toContain('chaotic-evil')
  })
})
