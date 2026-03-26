// scripts/codegen-content-packs.js
// Run once from repo root: node scripts/codegen-content-packs.js
// Converts legacy classes.js, feats.js, spells.js data → content/ Markdown files

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Load js-yaml from webapp's node_modules (it ships as a transitive dep of gray-matter)
const require = createRequire(import.meta.url)
const yaml = require(join(ROOT, 'webapp/node_modules/js-yaml'))

function toYaml(obj) {
  return yaml.dump(obj, { lineWidth: -1, quotingType: '"' })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function writeMd(dir, slug, frontmatter, body = '') {
  mkdirSync(dir, { recursive: true })
  const yamlStr = toYaml(frontmatter)
  const content = `---\n${yamlStr}---\n${body ? '\n' + body + '\n' : ''}`
  writeFileSync(join(dir, `${slug}.md`), content, 'utf8')
}

// ── Load legacy data ──────────────────────────────────────────────────────────

/**
 * Extracts a named constant from JS source by finding `const NAME = ` and
 * evaluating the remainder as an expression via new Function. This works
 * because JS stops parsing at the end of the first complete expression.
 *
 * If the constant references other variables (e.g. new Set([...])), this
 * will throw a ReferenceError. In that case use extractConstWithContext().
 */
function extractConst(src, name) {
  const marker = `const ${name} =`
  const start = src.indexOf(marker)
  if (start === -1) throw new Error(`${name} not found in source`)
  const valueStart = start + marker.length
  const snippet = src.slice(valueStart).trim()
  // eslint-disable-next-line no-new-func
  return new Function(`return ${snippet}`)()
}

const classesSrc = readFileSync(join(ROOT, 'classes.js'), 'utf8')
const featsSrc   = readFileSync(join(ROOT, 'feats.js'), 'utf8')

// Extract constants from classes.js
const RACES            = extractConst(classesSrc, 'RACES')
const TEMPLATES        = extractConst(classesSrc, 'TEMPLATES')
const CLASSES          = extractConst(classesSrc, 'CLASSES')
const PRESTIGE_CLASSES = extractConst(classesSrc, 'PRESTIGE_CLASSES')
const PRESTIGE_PREREQS = extractConst(classesSrc, 'PRESTIGE_PREREQS')

// Extract constants from feats.js
const BASE_FEATS              = extractConst(featsSrc, 'BASE_FEATS')
const CLASS_BONUS_FEAT_LEVELS = extractConst(featsSrc, 'CLASS_BONUS_FEAT_LEVELS')
const BONUS_FEAT_LISTS        = extractConst(featsSrc, 'BONUS_FEAT_LISTS')
const FEAT_PREREQS            = extractConst(featsSrc, 'FEAT_PREREQS')

console.log(`Loaded:`)
console.log(`  RACES: ${RACES.length}`)
console.log(`  TEMPLATES: ${TEMPLATES.length}`)
console.log(`  CLASSES: ${CLASSES.length}`)
console.log(`  PRESTIGE_CLASSES: ${PRESTIGE_CLASSES.length}`)
console.log(`  PRESTIGE_PREREQS: ${Object.keys(PRESTIGE_PREREQS).length} keys`)
console.log(`  BASE_FEATS: ${BASE_FEATS.length}`)
console.log(`  CLASS_BONUS_FEAT_LEVELS: ${Object.keys(CLASS_BONUS_FEAT_LEVELS).length} classes`)
console.log(`  BONUS_FEAT_LISTS: ${Object.keys(BONUS_FEAT_LISTS).length} classes`)
console.log(`  FEAT_PREREQS: ${Object.keys(FEAT_PREREQS).length} feats`)

// ── Build inverted bonus-feat lookup: feat → classes that grant it ────────────

const featToBonusSources = {}  // { "Power Attack": ["Fighter", "Warblade"] }
for (const [className, listDef] of Object.entries(BONUS_FEAT_LISTS)) {
  const feats = listDef.feats || []
  for (const f of feats) {
    if (!featToBonusSources[f]) featToBonusSources[f] = []
    featToBonusSources[f].push(className)
  }
  // Also handle byLevel entries
  if (listDef.byLevel) {
    for (const levelFeats of Object.values(listDef.byLevel)) {
      for (const f of levelFeats) {
        if (!featToBonusSources[f]) featToBonusSources[f] = []
        featToBonusSources[f].push(className)
      }
    }
  }
}

// ── 1. Races ─────────────────────────────────────────────────────────────────

const racesDir = join(ROOT, 'content', 'races')
let racesCount = 0

for (const race of RACES) {
  const slug = slugify(race.name)
  const frontmatter = {
    type: 'race',
    name: race.name,
    category: race.cat,
    la: race.la,
    rhd: race.rhd,
    rhdType: race.rhdType,
    bonuses: race.bonuses,
    traits: race.traits,
  }
  writeMd(racesDir, slug, frontmatter)
  racesCount++
}

console.log(`\nGenerated ${racesCount} race files → content/races/`)

// ── 2. Templates ─────────────────────────────────────────────────────────────

let templatesCount = 0

for (const tpl of TEMPLATES) {
  if (tpl.name === 'None') continue  // skip the sentinel entry
  const slug = `template-${slugify(tpl.name)}`
  const frontmatter = {
    type: 'race',
    subtype: 'template',
    name: tpl.name,
    category: 'Templates',
    la: tpl.la,
    bonuses: tpl.bonuses,
    traits: tpl.traits,
    features: tpl.features,
  }
  writeMd(racesDir, slug, frontmatter)
  templatesCount++
}

console.log(`Generated ${templatesCount} template files → content/races/`)

// ── 3. Feats ─────────────────────────────────────────────────────────────────

const featsDir = join(ROOT, 'content', 'feats')
let featsCount = 0

for (const featName of BASE_FEATS) {
  const slug = slugify(featName)
  const prereqs = FEAT_PREREQS[featName] || {}
  const bonusFeatFor = featToBonusSources[featName] || []

  const frontmatter = {
    type: 'feat',
    name: featName,
  }

  if (Object.keys(prereqs).length > 0) {
    frontmatter.prereqs = prereqs
  }

  if (bonusFeatFor.length > 0) {
    frontmatter.bonusFeatFor = bonusFeatFor
  }

  writeMd(featsDir, slug, frontmatter)
  featsCount++
}

console.log(`Generated ${featsCount} feat files → content/feats/`)

// ── 4. Base classes ───────────────────────────────────────────────────────────

const classesDir = join(ROOT, 'content', 'classes')
let classesCount = 0

for (const cls of CLASSES) {
  const slug = slugify(cls.n)
  const bonusFeats = CLASS_BONUS_FEAT_LEVELS[cls.n] || null

  const frontmatter = {
    type: 'class',
    name: cls.n,
    source: cls.s,
    hd: cls.hd,
    bab: cls.bab,
    saves: {
      fort: cls.fort,
      ref: cls.ref,
      will: cls.will,
    },
    skillPoints: cls.sp,
    classSkills: cls.cs,
    specialAbilities: cls.f,
  }

  if (bonusFeats) {
    frontmatter.bonusFeats = bonusFeats
  }

  writeMd(classesDir, slug, frontmatter)
  classesCount++
}

console.log(`Generated ${classesCount} base class files → content/classes/`)

// ── 5. Prestige classes ───────────────────────────────────────────────────────

let prestigeCount = 0

for (const cls of PRESTIGE_CLASSES) {
  const slug = `prestige-${slugify(cls.n)}`
  const prereqs = PRESTIGE_PREREQS[cls.n] || null
  const bonusFeats = CLASS_BONUS_FEAT_LEVELS[cls.n] || null

  const frontmatter = {
    type: 'class',
    subtype: 'prestige',
    name: cls.n,
    source: cls.s,
    hd: cls.hd,
    bab: cls.bab,
    saves: {
      fort: cls.fort,
      ref: cls.ref,
      will: cls.will,
    },
    skillPoints: cls.sp,
    maxLevel: cls.maxLvl || null,
    classSkills: cls.cs,
    specialAbilities: cls.f,
  }

  if (prereqs) {
    frontmatter.prereqs = prereqs
  }

  if (bonusFeats) {
    frontmatter.bonusFeats = bonusFeats
  }

  if (cls.special) {
    frontmatter.entryRequirements = cls.special
  }

  writeMd(classesDir, slug, frontmatter)
  prestigeCount++
}

console.log(`Generated ${prestigeCount} prestige class files → content/classes/`)

// ── 6. Spells (optional) ─────────────────────────────────────────────────────

const spellsJsPath = join(ROOT, 'spells.js')
if (!existsSync(spellsJsPath)) {
  console.warn('\nWARNING: spells.js not found — skipping spell generation')
} else {
  try {
    const spellsSrc = readFileSync(spellsJsPath, 'utf8')
    const SPELL_LIBRARY = extractConst(spellsSrc, 'SPELL_LIBRARY')
    const spellsDir = join(ROOT, 'content', 'spells')
    let spellsCount = 0

    for (const spell of SPELL_LIBRARY) {
      const slug = slugify(spell.name)
      const frontmatter = {
        type: 'spell',
        name: spell.name,
        school: spell.school,
        level: spell.level,
        classes: spell.classes,
      }
      writeMd(spellsDir, slug, frontmatter)
      spellsCount++
    }

    console.log(`Generated ${spellsCount} spell files → content/spells/`)
  } catch (err) {
    console.warn(`\nWARNING: Failed to generate spells — ${err.message}`)
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\nDone.')
