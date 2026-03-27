// scripts/codegen/lib/loader.mjs
// Loads all legacy data from classes.js, feats.js, spells.js

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..', '..')

function extractConst(src, name) {
  const marker = `const ${name} =`
  const start = src.indexOf(marker)
  if (start === -1) throw new Error(`${name} not found in source`)
  const valueStart = start + marker.length
  const snippet = src.slice(valueStart).trim()
  // eslint-disable-next-line no-new-func
  return new Function(`return ${snippet}`)()
}

export function loadAll() {
  const classesSrc = readFileSync(join(ROOT, 'classes.js'), 'utf8')
  const featsSrc = readFileSync(join(ROOT, 'feats.js'), 'utf8')

  const RACES            = extractConst(classesSrc, 'RACES')
  const TEMPLATES        = extractConst(classesSrc, 'TEMPLATES')
  const CLASSES          = extractConst(classesSrc, 'CLASSES')
  const PRESTIGE_CLASSES = extractConst(classesSrc, 'PRESTIGE_CLASSES')
  const PRESTIGE_PREREQS = extractConst(classesSrc, 'PRESTIGE_PREREQS')

  const BASE_FEATS              = extractConst(featsSrc, 'BASE_FEATS')
  const CLASS_BONUS_FEAT_LEVELS = extractConst(featsSrc, 'CLASS_BONUS_FEAT_LEVELS')
  const BONUS_FEAT_LISTS        = extractConst(featsSrc, 'BONUS_FEAT_LISTS')
  const FEAT_PREREQS            = extractConst(featsSrc, 'FEAT_PREREQS')
  const FEATS_STACKABLE         = extractConst(featsSrc, 'FEATS_STACKABLE')
  const FEAT_CHOICES            = extractConst(featsSrc, 'FEAT_CHOICES')
  const CLASS_PROFICIENCIES     = extractConst(featsSrc, 'CLASS_PROFICIENCIES')
  const RACE_PROFICIENCIES      = extractConst(featsSrc, 'RACE_PROFICIENCIES')
  const CLASS_STYLE_TRACKS      = extractConst(featsSrc, 'CLASS_STYLE_TRACKS')
  const CLASS_STYLE_INFO        = extractConst(featsSrc, 'CLASS_STYLE_INFO')

  const RACE_PHYSICAL = extractConst(classesSrc, 'RACE_PHYSICAL')
  const SPELLCASTING_CLASSES = extractConst(classesSrc, 'SPELLCASTING_CLASSES')
  const PSIONIC_CLASSES = extractConst(classesSrc, 'PSIONIC_CLASSES')

  let SPELL_LIBRARY = []
  const spellsJsPath = join(ROOT, 'spells.js')
  if (existsSync(spellsJsPath)) {
    const spellsSrc = readFileSync(spellsJsPath, 'utf8')
    SPELL_LIBRARY = extractConst(spellsSrc, 'SPELL_LIBRARY')
  }

  console.log(`Loaded: ${RACES.length} races, ${TEMPLATES.length} templates, ${CLASSES.length} classes, ${PRESTIGE_CLASSES.length} prestige, ${BASE_FEATS.length} feats, ${SPELL_LIBRARY.length} spells`)

  return {
    RACES, TEMPLATES, CLASSES, PRESTIGE_CLASSES, PRESTIGE_PREREQS,
    BASE_FEATS, CLASS_BONUS_FEAT_LEVELS, BONUS_FEAT_LISTS, FEAT_PREREQS,
    FEATS_STACKABLE, FEAT_CHOICES, CLASS_PROFICIENCIES, RACE_PROFICIENCIES,
    CLASS_STYLE_TRACKS, CLASS_STYLE_INFO, RACE_PHYSICAL,
    SPELLCASTING_CLASSES, PSIONIC_CLASSES, SPELL_LIBRARY,
    ROOT,
  }
}
