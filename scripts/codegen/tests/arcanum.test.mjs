import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { toArcanumFm } from '../lib/arcanum.mjs'

describe('toArcanumFm', () => {
  it('wraps fields in properties and generates id', () => {
    const result = toArcanumFm('class', 'Fighter', {
      source: 'PHB', hd: 10, bab: 'full',
      saves: { fort: 'good', ref: 'poor', will: 'poor' },
    }, ['source:phb', 'role:tank'])

    assert.equal(result.id, 'srd:class:fighter')
    assert.equal(result.entity_type, 'class')
    assert.equal(result.properties.name, 'Fighter')
    assert.equal(result.properties.hd, 10)
    assert.deepEqual(result.tags, ['source:phb', 'role:tank'])
    assert.equal(result.type, undefined)
  })

  it('slugifies names with special characters', () => {
    const result = toArcanumFm('feat', 'Power Attack', {}, ['combat'])
    assert.equal(result.id, 'srd:feat:power-attack')
  })
})
