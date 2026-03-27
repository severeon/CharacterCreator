#!/usr/bin/env node
// scripts/codegen/run.mjs
// Orchestrator: loads data, builds link maps, runs all generators

import { loadAll } from './lib/loader.mjs'
import { buildAllLinks } from './lib/links.mjs'
import { generateRaces } from './gen-races.mjs'
import { generateClasses } from './gen-classes.mjs'
import { generateFeats } from './gen-feats.mjs'
import { generateSpells } from './gen-spells.mjs'
import { generateContentRoot } from './gen-content-root.mjs'

console.log('=== D&D 3.5 Content Pack Generator ===\n')

// Phase 1: Load all data
console.log('Loading data...')
const data = loadAll()

// Phase 2: Build cross-reference maps
console.log('Building link maps...')
const links = buildAllLinks(data)
Object.assign(data, links)

// Phase 3: Generate all content
console.log('\nGenerating content...\n')

const racesCount  = generateRaces(data)
const classesCount = generateClasses(data)
const featsCount  = generateFeats(data)
const spellsCount = generateSpells(data)

// Phase 4: Root index
generateContentRoot(data.ROOT, {
  races: racesCount,
  classes: classesCount,
  feats: featsCount,
  spells: spellsCount,
})

console.log(`\nDone. Generated ${racesCount + classesCount + featsCount + spellsCount + 1} total files.`)
