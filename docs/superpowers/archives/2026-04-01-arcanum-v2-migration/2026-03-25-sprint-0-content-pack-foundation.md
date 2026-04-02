# Sprint 0: Content Pack Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the content pack loader (Markdown → typed JS objects) and codegen script (legacy JS data → `.md` files), with passing tests, before any React code is written.

**Architecture:** `gray-matter` parses YAML frontmatter from `.md` files in `content/`. A `loadContentPacks(dir)` function recursively reads all `.md` files and returns a typed `ContentPack` object. A one-time codegen script converts `classes.js`, `feats.js`, and `spells.js` into individual `.md` files committed to `content/`. A round-trip test validates that the loader produces equivalent data to the legacy JS objects.

**Tech Stack:** Node.js (scripts), `gray-matter` (frontmatter parsing), `vitest` (tests), Next.js 16 / React 19 (target webapp, not touched this sprint)

---

> **Important:** This webapp uses Next.js 16 which has breaking changes from earlier versions. Before writing any Next.js-specific code, read `webapp/node_modules/next/dist/docs/` for current API conventions. This sprint is mostly plain Node.js and Vitest, so this matters less here than in later sprints.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `webapp/package.json` | Modify | Add `gray-matter`, `vitest`, `@vitest/coverage-v8` |
| `webapp/vitest.config.js` | Create | Vitest config pointing at `src/__tests__` |
| `webapp/src/lib/content-pack-loader.js` | Create | `loadContentPacks(dir)` → `ContentPack` |
| `webapp/src/lib/content-pack-types.js` | Create | JSDoc type definitions for `Race`, `Class`, `Feat`, `Spell`, `Power`, `Campaign`, `ContentPack` |
| `webapp/src/__tests__/content-pack-loader.test.js` | Create | Unit + round-trip tests for loader |
| `scripts/codegen-content-packs.js` | Create | One-time: legacy JS → `.md` files in `content/` |
| `content/races/*.md` | Create (generated) | One file per race |
| `content/classes/*.md` | Create (generated) | One file per base class + prestige class |
| `content/feats/*.md` | Create (generated) | One file per feat |
| `content/spells/*.md` | Create (generated) | One file per spell, power, invocation |
| `.gitignore` | Modify | Ensure `.superpowers/` is ignored |

---

## Task 1: Install dependencies and configure Vitest

**Files:**
- Modify: `webapp/package.json`
- Create: `webapp/vitest.config.js`

- [ ] **Step 1: Add dependencies**

```bash
cd webapp && npm install gray-matter
npm install --save-dev vitest @vitest/coverage-v8
```

- [ ] **Step 2: Add test script to package.json**

In `webapp/package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 3: Create vitest.config.js**

```js
// webapp/vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.js'],
  },
})
```

- [ ] **Step 4: Verify vitest runs (with no tests yet)**

```bash
cd webapp && npm test
```

Expected: `No test files found` or `0 tests passed` — not an error.

- [ ] **Step 5: Commit**

```bash
cd webapp && git add package.json package-lock.json vitest.config.js
git commit -m "infra: add vitest and gray-matter for Sprint 0"
```

---

## Task 2: Define content pack types

**Files:**
- Create: `webapp/src/lib/content-pack-types.js`

- [ ] **Step 1: Create the types file**

```js
// webapp/src/lib/content-pack-types.js

/**
 * @typedef {Object} Race
 * @property {'race'} type
 * @property {string} name
 * @property {string} category
 * @property {number} la  - Level Adjustment
 * @property {number} rhd - Racial Hit Dice count
 * @property {number} rhdType - Racial Hit Die size (e.g. 8 for d8)
 * @property {Object.<string, number>} bonuses - Ability score bonuses, e.g. { str: 2, con: -2 }
 * @property {string[]} traits
 */

/**
 * @typedef {'full'|'3/4'|'1/2'} BabProgression
 * @typedef {'good'|'poor'} SaveProgression
 *
 * @typedef {Object} DndClass
 * @property {'class'} type
 * @property {string} name
 * @property {number} hd - Hit die size
 * @property {BabProgression} bab
 * @property {SaveProgression} fort
 * @property {SaveProgression} ref
 * @property {SaveProgression} will
 * @property {number} skillPoints - Skill points per level (before INT mod)
 * @property {string[]} classSkills
 * @property {boolean} prestige
 * @property {number} [maxLvl] - Max level for prestige classes
 * @property {number[]} [bonusFeats] - Levels that grant bonus feats
 * @property {string} [bonusFeatList] - Key into BONUS_FEAT_LISTS
 * @property {string} [special] - Freetext special abilities note
 */

/**
 * @typedef {Object} FeatPrereqs
 * @property {number} [bab]
 * @property {number} [str] @property {number} [dex] @property {number} [con]
 * @property {number} [int] @property {number} [wis] @property {number} [cha]
 * @property {string[]} [feats]
 * @property {Object.<string, number>} [skills]
 * @property {string} [special]
 *
 * @typedef {Object} Feat
 * @property {'feat'} type
 * @property {string} name
 * @property {FeatPrereqs} [prereqs]
 * @property {string[]} [bonusFeatLists] - Which class bonus feat lists include this feat
 */

/**
 * @typedef {Object} Spell
 * @property {'spell'} type
 * @property {string} name
 * @property {string} school
 * @property {string} [subschool]
 * @property {string} [descriptor]
 * @property {Object.<string, number>} classes - { wizard: 3, sorcerer: 3 }
 * @property {string[]} [components]
 * @property {string} [castingTime]
 * @property {string} [range]
 * @property {string} [duration]
 * @property {string} [savingThrow]
 * @property {boolean} [spellResistance]
 */

/**
 * @typedef {Object} Power
 * @property {'power'} type
 * @property {string} name
 * @property {string} discipline
 * @property {string} [descriptor]
 * @property {Object.<string, number>} classes - { psion: 1, wilder: 1 }
 * @property {number} powerPoints
 * @property {boolean} [augment]
 */

/**
 * @typedef {Object} Invocation
 * @property {'invocation'} type
 * @property {string} name
 * @property {'least'|'lesser'|'greater'|'dark'} grade
 * @property {string} [description]
 */

/**
 * @typedef {Object} Campaign
 * @property {'campaign'} type
 * @property {string} name
 * @property {'4d6'|'array'|'pointBuy'} abilityScoreMethod
 * @property {number} [pointBuyBudget]
 * @property {string[]} [allowedSources]
 * @property {string[]} [disabledClasses]
 * @property {string} [passwordHash]
 */

/**
 * @typedef {Object} ContentPack
 * @property {Race[]} races
 * @property {DndClass[]} classes
 * @property {Feat[]} feats
 * @property {Spell[]} spells
 * @property {Power[]} powers
 * @property {Invocation[]} invocations
 * @property {Campaign[]} campaigns
 */

export {}
```

- [ ] **Step 2: Commit**

```bash
cd webapp && git add src/lib/content-pack-types.js
git commit -m "feat: add JSDoc type definitions for content pack entities"
```

---

## Task 3: Write failing tests for the loader

**Files:**
- Create: `webapp/src/__tests__/content-pack-loader.test.js`

Write tests BEFORE implementing the loader. They will all fail until Task 4.

- [ ] **Step 1: Create test file with fixture data**

```js
// webapp/src/__tests__/content-pack-loader.test.js
import { describe, it, expect, beforeAll } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { loadContentPacks } from '../lib/content-pack-loader.js'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TMP = join(import.meta.dirname, '__fixtures__/content-packs')

const RACE_MD = `---
type: race
name: Elf, High
category: Elves
la: 0
rhd: 0
rhdType: 8
bonuses:
  dex: 2
  con: -2
traits:
  - Low-light vision
  - Immune magic sleep
---
Optional flavor text.
`

const CLASS_MD = `---
type: class
name: Fighter
hd: 10
bab: full
fort: good
ref: poor
will: poor
skillPoints: 2
classSkills:
  - Climb
  - Jump
prestige: false
bonusFeats: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
bonusFeatList: fighter
---
`

const FEAT_MD = `---
type: feat
name: Power Attack
prereqs:
  bab: 1
  str: 13
---
Trade attack bonus for damage bonus.
`

const SPELL_MD = `---
type: spell
name: Fireball
school: Evocation
descriptor: Fire
classes:
  wizard: 3
  sorcerer: 3
castingTime: "1 standard action"
savingThrow: Reflex half
spellResistance: true
---
`

const POWER_MD = `---
type: power
name: Mind Thrust
discipline: Telepathy
descriptor: Mind-Affecting
classes:
  psion: 1
  wilder: 1
powerPoints: 1
augment: true
---
`

const CAMPAIGN_MD = `---
type: campaign
name: Test Campaign
abilityScoreMethod: pointBuy
pointBuyBudget: 28
allowedSources:
  - core
disabledClasses: []
---
`

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeAll(() => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(join(TMP, 'races'), { recursive: true })
  mkdirSync(join(TMP, 'classes'), { recursive: true })
  mkdirSync(join(TMP, 'feats'), { recursive: true })
  mkdirSync(join(TMP, 'spells'), { recursive: true })
  mkdirSync(join(TMP, 'campaigns'), { recursive: true })
  writeFileSync(join(TMP, 'races/elf-high.md'), RACE_MD)
  writeFileSync(join(TMP, 'classes/fighter.md'), CLASS_MD)
  writeFileSync(join(TMP, 'feats/power-attack.md'), FEAT_MD)
  writeFileSync(join(TMP, 'spells/fireball.md'), SPELL_MD)
  writeFileSync(join(TMP, 'spells/mind-thrust.md'), POWER_MD)
  writeFileSync(join(TMP, 'campaigns/test-campaign.md'), CAMPAIGN_MD)
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('loadContentPacks', () => {
  it('returns a ContentPack with all entity arrays', async () => {
    const pack = await loadContentPacks(TMP)
    expect(pack).toHaveProperty('races')
    expect(pack).toHaveProperty('classes')
    expect(pack).toHaveProperty('feats')
    expect(pack).toHaveProperty('spells')
    expect(pack).toHaveProperty('powers')
    expect(pack).toHaveProperty('invocations')
    expect(pack).toHaveProperty('campaigns')
  })

  it('parses a race correctly', async () => {
    const { races } = await loadContentPacks(TMP)
    expect(races).toHaveLength(1)
    const elf = races[0]
    expect(elf.name).toBe('Elf, High')
    expect(elf.category).toBe('Elves')
    expect(elf.la).toBe(0)
    expect(elf.bonuses.dex).toBe(2)
    expect(elf.bonuses.con).toBe(-2)
    expect(elf.traits).toContain('Low-light vision')
  })

  it('parses a class correctly', async () => {
    const { classes } = await loadContentPacks(TMP)
    expect(classes).toHaveLength(1)
    const fighter = classes[0]
    expect(fighter.name).toBe('Fighter')
    expect(fighter.hd).toBe(10)
    expect(fighter.bab).toBe('full')
    expect(fighter.prestige).toBe(false)
    expect(fighter.bonusFeats).toContain(1)
    expect(fighter.classSkills).toContain('Climb')
  })

  it('parses a feat correctly', async () => {
    const { feats } = await loadContentPacks(TMP)
    expect(feats).toHaveLength(1)
    const feat = feats[0]
    expect(feat.name).toBe('Power Attack')
    expect(feat.prereqs.bab).toBe(1)
    expect(feat.prereqs.str).toBe(13)
  })

  it('separates spells from powers by type field', async () => {
    const { spells, powers } = await loadContentPacks(TMP)
    expect(spells).toHaveLength(1)
    expect(spells[0].name).toBe('Fireball')
    expect(powers).toHaveLength(1)
    expect(powers[0].name).toBe('Mind Thrust')
    expect(powers[0].powerPoints).toBe(1)
  })

  it('parses a campaign correctly', async () => {
    const { campaigns } = await loadContentPacks(TMP)
    expect(campaigns).toHaveLength(1)
    const campaign = campaigns[0]
    expect(campaign.name).toBe('Test Campaign')
    expect(campaign.abilityScoreMethod).toBe('pointBuy')
    expect(campaign.pointBuyBudget).toBe(28)
  })

  it('throws on unknown type field', async () => {
    writeFileSync(join(TMP, 'races/bad.md'), '---\ntype: banana\nname: Bad\n---\n')
    await expect(loadContentPacks(TMP)).rejects.toThrow(/unknown type/i)
    rmSync(join(TMP, 'races/bad.md'))
  })

  it('recurses into subdirectories', async () => {
    mkdirSync(join(TMP, 'races/subdir'), { recursive: true })
    writeFileSync(join(TMP, 'races/subdir/human.md'), `---\ntype: race\nname: Human\ncategory: Human Variants\nla: 0\nrhd: 0\nrhdType: 8\nbonuses: {}\ntraits:\n  - Bonus feat\n---\n`)
    const { races } = await loadContentPacks(TMP)
    expect(races.length).toBeGreaterThanOrEqual(2)
    rmSync(join(TMP, 'races/subdir'), { recursive: true })
  })
})
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
cd webapp && npm test
```

Expected: FAIL — `Cannot find module '../lib/content-pack-loader.js'`

- [ ] **Step 3: Commit the failing tests**

```bash
cd webapp && git add src/__tests__/content-pack-loader.test.js
git commit -m "test: add failing content-pack-loader tests (red)"
```

---

## Task 4: Implement the content pack loader

**Files:**
- Create: `webapp/src/lib/content-pack-loader.js`

- [ ] **Step 1: Create the loader**

```js
// webapp/src/lib/content-pack-loader.js
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import matter from 'gray-matter'

const VALID_TYPES = new Set(['race', 'class', 'feat', 'spell', 'power', 'invocation', 'campaign'])

/**
 * Recursively collect all .md file paths under a directory.
 * @param {string} dir
 * @returns {string[]}
 */
function collectMdFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      results.push(...collectMdFiles(fullPath))
    } else if (extname(entry) === '.md') {
      results.push(fullPath)
    }
  }
  return results
}

/**
 * Parse a single .md file into a typed entity object.
 * @param {string} filePath
 * @returns {object}
 */
function parseEntityFile(filePath) {
  const raw = readFileSync(filePath, 'utf8')
  const { data } = matter(raw)

  if (!data.type || !VALID_TYPES.has(data.type)) {
    throw new Error(`Unknown type "${data.type}" in ${filePath}. Expected one of: ${[...VALID_TYPES].join(', ')}`)
  }

  return data
}

/**
 * Load all content pack entities from a directory tree.
 * @param {string} dir - Root directory containing races/, classes/, feats/, etc.
 * @returns {Promise<import('./content-pack-types.js').ContentPack>}
 */
export async function loadContentPacks(dir) {
  const files = collectMdFiles(dir)

  /** @type {import('./content-pack-types.js').ContentPack} */
  const pack = {
    races: [],
    classes: [],
    feats: [],
    spells: [],
    powers: [],
    invocations: [],
    campaigns: [],
  }

  for (const filePath of files) {
    const entity = parseEntityFile(filePath)
    switch (entity.type) {
      case 'race':       pack.races.push(entity);       break
      case 'class':      pack.classes.push(entity);     break
      case 'feat':       pack.feats.push(entity);       break
      case 'spell':      pack.spells.push(entity);      break
      case 'power':      pack.powers.push(entity);      break
      case 'invocation': pack.invocations.push(entity); break
      case 'campaign':   pack.campaigns.push(entity);   break
    }
  }

  return pack
}
```

- [ ] **Step 2: Run the tests — confirm they pass**

```bash
cd webapp && npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
cd webapp && git add src/lib/content-pack-loader.js src/lib/content-pack-types.js
git commit -m "feat: implement content pack loader (green)"
```

---

## Task 5: Write the codegen script

This converts `classes.js`, `feats.js`, and (optionally) the inline spells data from `dnd35_gestalt_v4.html` into individual `.md` files under `content/`.

**Files:**
- Create: `scripts/codegen-content-packs.js`

Note: `classes.js` and `feats.js` use `const X = [...]` syntax. The script loads them via dynamic `import()` after temporarily wrapping in `export`. The simplest approach is to read them as strings, replace `const X =` with `export const X =`, write to a temp file, and import.

- [ ] **Step 1: Create the codegen script**

```js
// scripts/codegen-content-packs.js
// Run once from repo root: node scripts/codegen-content-packs.js
// Converts legacy classes.js, feats.js data → content/ Markdown files

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Load legacy data ──────────────────────────────────────────────────────────
// We eval the legacy files in a limited context to extract their constants.
// These files use `const X = [...]` — we extract the arrays via regex+eval.

function extractConst(src, name) {
  // Match: const NAME = <value>;  (value may be multi-line)
  // We use a simple approach: slice from after "const NAME = " to the matching
  // closing bracket, then JSON-parse the result.
  const marker = `const ${name} =`
  const start = src.indexOf(marker)
  if (start === -1) throw new Error(`${name} not found in source`)
  const valueStart = start + marker.length
  // Use Function constructor to safely evaluate the JS literal
  // (This is intentional — we own the source files being evaluated)
  const snippet = src.slice(valueStart).trim()
  // eslint-disable-next-line no-new-func
  return new Function(`return ${snippet}`)()
}

const classesSrc = readFileSync(join(ROOT, 'classes.js'), 'utf8')
const featsSrc   = readFileSync(join(ROOT, 'feats.js'), 'utf8')

const RACES            = extractConst(classesSrc, 'RACES')
const CLASSES          = extractConst(classesSrc, 'CLASSES')
const PRESTIGE_CLASSES = extractConst(classesSrc, 'PRESTIGE_CLASSES')
const PRESTIGE_PREREQS = extractConst(classesSrc, 'PRESTIGE_PREREQS')
const TEMPLATES        = extractConst(classesSrc, 'TEMPLATES')
const FEAT_PREREQS          = extractConst(featsSrc,   'FEAT_PREREQS')
const BASE_FEATS            = extractConst(featsSrc,   'BASE_FEATS')
const BONUS_FEAT_LISTS      = extractConst(featsSrc,   'BONUS_FEAT_LISTS')
// CLASS_BONUS_FEAT_LEVELS maps class name → level numbers for bonus feats
// (e.g. Fighter: [1,2,4,6,8,10,12,14,16,18,20])
// This is separate from cls.f in CLASSES, which holds freetext special ability strings.
const CLASS_BONUS_FEAT_LEVELS = extractConst(featsSrc, 'CLASS_BONUS_FEAT_LEVELS')

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// NOTE: gray-matter depends on js-yaml, which is already in node_modules.
// Use js-yaml's dump() to avoid hand-rolling YAML serialization.
import yaml from 'js-yaml'

function toYaml(obj) {
  return yaml.dump(obj, { lineWidth: -1, quotingType: '"' })
}

// Keep this stub to avoid breaking callers — real impl replaced above
function _toYaml_unused(obj, indent = 0) {
  const pad = ' '.repeat(indent)
  let out = ''
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    if (Array.isArray(v)) {
      if (v.length === 0) {
        out += `${pad}${k}: []\n`
      } else if (v.every(i => typeof i !== 'object')) {
        // Inline array for primitives
        out += `${pad}${k}:\n`
        for (const item of v) {
          const s = typeof item === 'string' ? `"${item.replace(/"/g, '\\"')}"` : item
          out += `${pad}  - ${s}\n`
        }
      } else {
        out += `${pad}${k}:\n`
        for (const item of v) {
          out += toYaml(item, indent + 2).replace(/^  /, `${pad}  - `).replace(/\n( +)/g, (_, sp) => '\n' + sp)
        }
      }
    } else if (typeof v === 'object') {
      out += `${pad}${k}:\n`
      out += toYaml(v, indent + 2)
    } else if (typeof v === 'string') {
      const needsQuotes = v.includes(':') || v.includes('#') || v.includes('"') || v.startsWith(' ')
      out += `${pad}${k}: ${needsQuotes ? `"${v.replace(/"/g, '\\"')}"` : v}\n`
    } else {
      out += `${pad}${k}: ${v}\n`
    }
  }
  return out
}

function writeMd(dir, slug, frontmatter, body = '') {
  mkdirSync(dir, { recursive: true })
  const yamlStr = toYaml(frontmatter)
  const content = `---\n${yamlStr}---\n${body ? '\n' + body + '\n' : ''}`
  writeFileSync(join(dir, `${slug}.md`), content, 'utf8')
}

// ── Races ─────────────────────────────────────────────────────────────────────

const racesDir = join(ROOT, 'content/races')
for (const race of RACES) {
  const fm = {
    type: 'race',
    name: race.name,
    category: race.cat,
    la: race.la,
    rhd: race.rhd,
    rhdType: race.rhdType,
    bonuses: Object.keys(race.bonuses).length > 0 ? race.bonuses : {},
    traits: race.traits,
  }
  writeMd(racesDir, slugify(race.name), fm)
}
console.log(`✓ Generated ${RACES.length} races`)

// ── Templates (stored as races with type: template) ──────────────────────────

for (const tmpl of TEMPLATES) {
  const fm = {
    type: 'race',
    subtype: 'template',
    name: tmpl.name,
    category: 'Templates',
    la: tmpl.la ?? 0,
    rhd: 0,
    rhdType: 8,
    bonuses: tmpl.bonuses ?? {},
    traits: tmpl.traits ?? [],
  }
  writeMd(racesDir, `template-${slugify(tmpl.name)}`, fm)
}
console.log(`✓ Generated ${TEMPLATES.length} templates`)

// ── Build bonus feat membership map ──────────────────────────────────────────
// Invert BONUS_FEAT_LISTS so each feat knows which class lists it belongs to.
const featBonusLists = {}
for (const [className, listDef] of Object.entries(BONUS_FEAT_LISTS)) {
  const feats = listDef.feats ?? []
  for (const feat of feats) {
    if (!featBonusLists[feat]) featBonusLists[feat] = []
    featBonusLists[feat].push(className.toLowerCase())
  }
}

// ── Feats ─────────────────────────────────────────────────────────────────────

const featsDir = join(ROOT, 'content/feats')
for (const featName of BASE_FEATS) {
  const prereqs = FEAT_PREREQS?.[featName] ?? {}
  const bonusLists = featBonusLists[featName] ?? []
  const fm = {
    type: 'feat',
    name: featName,
    ...(Object.keys(prereqs).length > 0 && { prereqs }),
    ...(bonusLists.length > 0 && { bonusFeatLists: bonusLists }),
  }
  writeMd(featsDir, slugify(featName), fm)
}
console.log(`✓ Generated ${BASE_FEATS.length} feats`)

// ── Classes (base) ────────────────────────────────────────────────────────────

const classesDir = join(ROOT, 'content/classes')
for (const cls of CLASSES) {
  // cls.f = freetext special ability strings (e.g. "Bonus Feats (every even level)")
  // Bonus feat level numbers come from CLASS_BONUS_FEAT_LEVELS in feats.js, not cls.f
  const bonusFeatLevels = CLASS_BONUS_FEAT_LEVELS[cls.n] ?? []
  const fm = {
    type: 'class',
    name: cls.n,
    hd: cls.hd,
    bab: cls.bab,
    fort: cls.fort,
    ref: cls.ref,
    will: cls.will,
    skillPoints: cls.sp,
    classSkills: cls.cs ?? [],
    prestige: false,
    ...(bonusFeatLevels.length > 0 && { bonusFeats: bonusFeatLevels }),
    ...(cls.f && cls.f.length > 0 && { specialAbilities: cls.f }),
    ...(cls.special && { special: cls.special }),
  }
  writeMd(classesDir, slugify(cls.n), fm)
}
console.log(`✓ Generated ${CLASSES.length} base classes`)

// ── Classes (prestige) ────────────────────────────────────────────────────────

for (const cls of PRESTIGE_CLASSES) {
  const prereqs = PRESTIGE_PREREQS?.[cls.n] ?? {}
  // cls.f for prestige classes holds freetext class feature strings (e.g. "Sneak Attack +1d6")
  // not level numbers — store as specialAbilities to match base class treatment
  const bonusFeatLevels = CLASS_BONUS_FEAT_LEVELS[cls.n] ?? []
  const fm = {
    type: 'class',
    name: cls.n,
    hd: cls.hd,
    bab: cls.bab,
    fort: cls.fort,
    ref: cls.ref,
    will: cls.will,
    skillPoints: cls.sp,
    classSkills: cls.cs ?? [],
    prestige: true,
    ...(cls.maxLvl && { maxLvl: cls.maxLvl }),
    ...(bonusFeatLevels.length > 0 && { bonusFeats: bonusFeatLevels }),
    ...(cls.f && cls.f.length > 0 && { specialAbilities: cls.f }),
    ...(Object.keys(prereqs).length > 0 && { prereqs }),
    ...(cls.special && { special: cls.special }),
  }
  writeMd(classesDir, `prestige-${slugify(cls.n)}`, fm)
}
console.log(`✓ Generated ${PRESTIGE_CLASSES.length} prestige classes`)

// ── Spells ────────────────────────────────────────────────────────────────────
// Spells are embedded in dnd35_gestalt_v4.html — extract them separately.
// The spells.js file (if it exists) is used as the source.

try {
  const spellsSrc = readFileSync(join(ROOT, 'spells.js'), 'utf8')
  const SPELL_LIBRARY     = extractConst(spellsSrc, 'SPELL_LIBRARY')
  const POWER_LIBRARY     = extractConst(spellsSrc, 'POWER_LIBRARY')
  const WARLOCK_INVOCATIONS = extractConst(spellsSrc, 'WARLOCK_INVOCATIONS')

  const spellsDir = join(ROOT, 'content/spells')

  for (const spell of SPELL_LIBRARY) {
    const fm = {
      type: 'spell',
      name: spell.name ?? spell.n,
      school: spell.school,
      ...(spell.subschool && { subschool: spell.subschool }),
      ...(spell.descriptor && { descriptor: spell.descriptor }),
      classes: spell.classes ?? spell.cl ?? {},
    }
    writeMd(spellsDir, slugify(fm.name), fm)
  }
  console.log(`✓ Generated ${SPELL_LIBRARY.length} spells`)

  for (const power of POWER_LIBRARY) {
    const fm = {
      type: 'power',
      name: power.name ?? power.n,
      discipline: power.discipline ?? power.d,
      classes: power.classes ?? power.cl ?? {},
      powerPoints: power.powerPoints ?? power.pp ?? 1,
      ...(power.augment && { augment: true }),
    }
    writeMd(spellsDir, `power-${slugify(fm.name)}`, fm)
  }
  console.log(`✓ Generated ${POWER_LIBRARY.length} powers`)

  for (const inv of WARLOCK_INVOCATIONS) {
    const fm = {
      type: 'invocation',
      name: inv.name ?? inv.n,
      grade: inv.grade ?? inv.g ?? 'least',
    }
    writeMd(spellsDir, `invocation-${slugify(fm.name)}`, fm)
  }
  console.log(`✓ Generated ${WARLOCK_INVOCATIONS.length} invocations`)

} catch (e) {
  if (e.code === 'ENOENT') {
    console.warn('⚠ spells.js not found — skipping spell/power/invocation generation')
    console.warn('  Extract SPELL_LIBRARY, POWER_LIBRARY, WARLOCK_INVOCATIONS from dnd35_gestalt_v4.html into spells.js first')
  } else {
    throw e
  }
}

console.log('\n✓ Content pack generation complete. Files written to content/')
```

- [ ] **Step 2: Run the codegen script**

```bash
cd /path/to/CharacterCreator && node scripts/codegen-content-packs.js
```

Expected output:
```
✓ Generated N races
✓ Generated N templates
✓ Generated N feats
✓ Generated N base classes
✓ Generated N prestige classes
⚠ spells.js not found — skipping spell/power/invocation generation
  Extract SPELL_LIBRARY, POWER_LIBRARY, WARLOCK_INVOCATIONS from dnd35_gestalt_v4.html into spells.js first
✓ Content pack generation complete. Files written to content/
```

- [ ] **Step 3: Spot-check generated files**

```bash
cat content/races/elf-high.md
cat content/classes/fighter.md
cat content/feats/power-attack.md
cat content/classes/prestige-arcane-archer.md  # verify prereqs are present
```

Confirm frontmatter looks correct. If a field is missing or mis-named, fix `codegen-content-packs.js` and re-run.

- [ ] **Step 4: Commit the codegen script and generated content**

```bash
git add scripts/codegen-content-packs.js content/
git commit -m "feat: add codegen script and generated content packs from legacy data"
```

---

## Task 6: Write the round-trip test

This validates that loading the generated `.md` files produces equivalent data to the legacy JS constants.

**Files:**
- Create: `webapp/src/__tests__/content-pack-round-trip.test.js`

- [ ] **Step 1: Create round-trip test**

```js
// webapp/src/__tests__/content-pack-round-trip.test.js
// Validates that content/ files round-trip correctly through the loader.
// Tests that generated data shape matches legacy JS constants.
import { describe, it, expect, beforeAll } from 'vitest'
import { join, dirname } from 'node:path'
import { loadContentPacks } from '../lib/content-pack-loader.js'

// import.meta.dirname = webapp/src/__tests__
// dirname(...)         = webapp/src
// ../../content        = CharacterCreator/content
const CONTENT_DIR = join(dirname(import.meta.dirname), '../../content')

let pack

beforeAll(async () => {
  pack = await loadContentPacks(CONTENT_DIR)
})

describe('round-trip: races', () => {
  it('loads at least 50 races', () => {
    expect(pack.races.length).toBeGreaterThanOrEqual(50)
  })

  it('every race has required fields', () => {
    for (const race of pack.races) {
      expect(race, `race "${race.name}" missing 'name'`).toHaveProperty('name')
      expect(race, `race "${race.name}" missing 'category'`).toHaveProperty('category')
      expect(typeof race.la, `race "${race.name}" la not a number`).toBe('number')
      expect(Array.isArray(race.traits), `race "${race.name}" traits not array`).toBe(true)
    }
  })

  it('Human is present with no bonuses', () => {
    const human = pack.races.find(r => r.name === 'Human')
    expect(human).toBeDefined()
    expect(Object.keys(human.bonuses ?? {})).toHaveLength(0)
  })

  it('Drow has la: 2', () => {
    const drow = pack.races.find(r => r.name === 'Drow (Dark Elf)')
    expect(drow).toBeDefined()
    expect(drow.la).toBe(2)
  })
})

describe('round-trip: classes', () => {
  it('loads at least 15 base classes', () => {
    const base = pack.classes.filter(c => !c.prestige)
    expect(base.length).toBeGreaterThanOrEqual(15)
  })

  it('loads at least 10 prestige classes', () => {
    const prestige = pack.classes.filter(c => c.prestige)
    expect(prestige.length).toBeGreaterThanOrEqual(10)
  })

  it('Fighter has hd: 10, bab: full, 11 bonus feat levels', () => {
    const fighter = pack.classes.find(c => c.name === 'Fighter')
    expect(fighter).toBeDefined()
    expect(fighter.hd).toBe(10)
    expect(fighter.bab).toBe('full')
    expect(fighter.bonusFeats).toHaveLength(11)
  })

  it('Wizard has hd: 4, bab: poor', () => {
    // Legacy classes.js uses 'full', 'medium', 'poor' — not fractions
    const wizard = pack.classes.find(c => c.name === 'Wizard')
    expect(wizard).toBeDefined()
    expect(wizard.hd).toBe(4)
    expect(wizard.bab).toBe('poor')
  })
})

describe('round-trip: feats', () => {
  it('loads at least 100 feats', () => {
    expect(pack.feats.length).toBeGreaterThanOrEqual(100)
  })

  it('Power Attack has bab: 1 and str: 13 prereqs', () => {
    const feat = pack.feats.find(f => f.name === 'Power Attack')
    expect(feat).toBeDefined()
    expect(feat.prereqs?.bab).toBe(1)
    expect(feat.prereqs?.str).toBe(13)
  })

  it('Cleave has Power Attack as feat prereq', () => {
    const feat = pack.feats.find(f => f.name === 'Cleave')
    expect(feat).toBeDefined()
    expect(feat.prereqs?.feats).toContain('Power Attack')
  })
})
```

- [ ] **Step 2: Run the round-trip tests**

```bash
cd webapp && npm test
```

Expected: all tests pass. If a test fails, the codegen script produced malformed data — go back and fix it, re-run codegen, then re-run tests.

- [ ] **Step 3: Commit**

```bash
cd webapp && git add src/__tests__/content-pack-round-trip.test.js
git commit -m "test: add round-trip tests validating generated content packs"
```

---

## Task 7: Ensure .gitignore covers generated artifacts

**Files:**
- Modify: root `.gitignore` (or create if missing)

- [ ] **Step 1: Check existing .gitignore**

```bash
cat .gitignore
```

- [ ] **Step 2: Add entries if missing**

Ensure these lines are present in root `.gitignore`:
```
.superpowers/
webapp/src/__tests__/__fixtures__/
```

The `__fixtures__` directory is created at test runtime and should not be committed.

- [ ] **Step 3: Commit if changed**

```bash
git add .gitignore && git commit -m "chore: ignore test fixtures and brainstorm artifacts"
```

---

## Verification

Run the full suite from the repo root:

```bash
# 1. Confirm content was generated
ls content/races/ | wc -l      # should be 50+
ls content/classes/ | wc -l    # should be 30+
ls content/feats/ | wc -l      # should be 100+

# 2. Run all tests
cd webapp && npm test

# Expected: all tests pass
# - content-pack-loader.test.js: 8 tests
# - content-pack-round-trip.test.js: 10 tests

# 3. Confirm the legacy app still works (no changes made to it)
cd .. && python -m http.server 8080
# Open http://localhost:8080/dnd35_gestalt_v4.html — should work unchanged
```

Sprint 0 is complete when:
- [ ] All Vitest tests pass
- [ ] `content/` directory is populated with valid `.md` files
- [ ] Round-trip tests confirm no data was lost in the conversion
- [ ] Legacy app is untouched and still functional
