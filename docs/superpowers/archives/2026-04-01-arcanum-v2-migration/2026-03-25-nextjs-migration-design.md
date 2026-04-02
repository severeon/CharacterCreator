# D&D 3.5 Character Creator — Next.js Migration Design

**Date:** 2026-03-25
**Status:** Approved

---

## Context

The current app (`dnd35_gestalt_v4.html`) is a 5,900-line single-file browser app produced through a long vibe-coding session with no architecture. All CSS, HTML, JS logic, and game data live in one file. There are zero tests. The gestalt mechanic, feat/prestige prerequisite chains, and spell slot calculations are tangled into DOM-manipulating render functions with two global mutable objects (`S` and `DM`).

The goal is a clean, maintainable React/Next.js rewrite with proper component boundaries, testable business logic, and a content-pack system backed by Markdown files. The old app stays live throughout migration; the new app is built in parallel and replaces it once complete.

---

## Approach: Foundation → Features

**Sprint 0** builds the data layer (content pack loader). **Sprint 1** builds the state skeleton. **Sprints 2–9** each deliver one fully tested feature tab. The old app remains the reference implementation throughout.

---

## Project Structure

```
CharacterCreator/
├── content/                        ← Markdown content packs (committed to repo)
│   ├── races/                      ← one .md file per race
│   ├── classes/                    ← one .md file per class (base + prestige)
│   ├── feats/                      ← one .md file per feat
│   ├── spells/                     ← one .md file per spell/power/invocation
│   └── campaigns/                  ← persisted DM campaign settings
├── webapp/
│   └── src/
│       ├── app/
│       │   ├── layout.js
│       │   ├── page.js             ← landing / character list
│       │   └── character/[id]/
│       │       └── page.js         ← builder UI (tab shell)
│       ├── components/
│       │   ├── tabs/               ← IdentityTab, AbilitiesTab, LevelsTab,
│       │   │                         SkillsTab, FeatsTab, SpellsTab,
│       │   │                         SheetTab, DmToolsTab
│       │   ├── modals/             ← ClassPicker, FeatPicker, RacePicker,
│       │   │                         TemplatePicker, ChoiceModal, PasswordModal
│       │   └── ui/                 ← shared primitives (Button, Modal, etc.)
│       ├── context/
│       │   ├── CharacterContext.js ← character state + reducer (mirrors legacy S)
│       │   └── DmContext.js        ← campaign settings + reducer (mirrors legacy DM)
│       ├── lib/
│       │   ├── content-pack-loader.js   ← parse MD frontmatter → ContentPack object
│       │   ├── rules/
│       │   │   ├── prereq-solver.js     ← directed graph solver for prereq chains
│       │   │   ├── feat-prereqs.js      ← canTakeFeat(feat, char, pack)
│       │   │   ├── prestige-prereqs.js  ← canTakePrestigeClass(cls, char, pack)
│       │   │   ├── skill-budget.js      ← getSkillBudget(char, pack)
│       │   │   ├── gestalt.js           ← getGestaltProgression(levels, pack)
│       │   │   ├── spell-slots.js       ← getSpellSlots(levels, pack)
│       │   │   └── ability-scores.js    ← calcPointBuyCost, getFinalScores
│       │   └── character-sheet-export.js ← print/PDF/markdown export
│       └── __tests__/
│           ├── rules/              ← unit tests per rules module
│           └── content-pack-loader.test.js
└── scripts/
    └── codegen-content-packs.js    ← one-time: classes.js+feats.js+spells.js → .md files
```

---

## Content Pack Schema

One `.md` file per entity. YAML frontmatter holds all structured data; the body is optional flavor/notes text.

**Race** (`content/races/elf.md`):
```yaml
---
type: race
name: Elf
category: Core
la: 0
rhd: 0
bonuses:
  dex: 2
  con: -2
traits:
  - Immunity to magic sleep
  - Low-light vision
---
```

**Class** (`content/classes/fighter.md`):
```yaml
---
type: class
name: Fighter
hd: 10
bab: full
fort: good
ref: poor
will: poor
skillPoints: 2
classSkills: [Climb, Jump, Swim]
bonusFeats: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
bonusFeatList: fighter
prestige: false
---
```

**Feat** (`content/feats/power-attack.md`):
```yaml
---
type: feat
name: Power Attack
prereqs:
  bab: 1
  str: 13
---
Trade attack bonus for damage bonus on melee attacks.
```

**Spell** (`content/spells/fireball.md`):
```yaml
---
type: spell
name: Fireball
school: Evocation
subschool: ~
descriptor: Fire
classes:
  wizard: 3
  sorcerer: 3
components: [V, S, M]
castingTime: "1 standard action"
range: long
area: "20-ft-radius spread"
duration: instantaneous
savingThrow: Reflex half
spellResistance: yes
---
Classic area-of-effect fire damage spell.
```

**Psionic Power** (`content/spells/mind-thrust.md`):
```yaml
---
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
```

**Campaign** (`content/campaigns/my-campaign.md`):
```yaml
---
type: campaign
name: My Campaign
abilityScoreMethod: pointBuy
pointBuyBudget: 28
allowedSources: [core, srd]
disabledClasses: [Samurai]
passwordHash: "..."
---
DM notes.
```

Schema is intentionally minimal — fields are extended as features reveal the need.

> **Campaign write path (Sprint 9):** Creating or updating a campaign from DM Tools requires writing a `.md` file to disk. In Next.js this is a server action or API route — not a pure client operation. Sprint 9 must resolve this explicitly (server action writing to `content/campaigns/` is the expected approach).

### Loader

`loadContentPacks(dir)` — reads all `*.md` files recursively, parses YAML frontmatter via `gray-matter`, validates `type` field, returns:
```js
ContentPack { races[], classes[], feats[], spells[], campaigns[] }
```

Called once at server startup or build time. Result is passed into context providers. Multiple `content/` directories can be merged to support homebrew packs.

### Data Migration

`scripts/codegen-content-packs.js` is a one-time script run in Sprint 0 that converts `classes.js`, `feats.js`, and `spells.js` into individual `.md` files committed to `content/`. After this, the legacy JS data files are retired as authoritative sources.

---

## State Management

React Context + `useReducer`. Two contexts mirror the two legacy globals.

**CharacterContext** (mirrors `S`):
```js
{
  name, race, alignment,
  physical: { height, weight, age, ... },
  scores: { str, dex, con, int, wis, cha },
  levels: [{ classA, classB }, ...],     // gestalt pairs
  skillRanks: { [skillName]: number },
  featSlots: [{ source, feat }, ...],
  spells: { known: [], prepared: [] },
  powers: { known: [], points: 0 }
}
```

**DmContext** (mirrors `DM`):
```js
{
  campaign: null | CampaignMeta,
  abilityScoreMethod: '4d6' | 'array' | 'pointBuy',
  pointBuyBudget: 28,
  allowedSources: string[],
  disabledClasses: string[],
  locked: boolean
}
```

Actions follow the pattern `SET_RACE`, `ADD_LEVEL`, `SET_SKILL_RANK`, `ADD_FEAT`, etc.

---

## Rules Engine

All game logic lives in `lib/rules/` as **pure functions** — no React, no side effects, fully unit-testable.

### Prerequisite Graph Solver (`prereq-solver.js`)

D&D 3.5 prereq chains are directed graphs (feat → feat → stat, with OR branches). A flat checklist cannot handle chains, shared dependencies, or "why not eligible" explanations. The solver uses a small typed graph with memoized topological traversal.

**Node types:**
- `FeatNode` — "must have feat X" (which itself has prereqs → recurse)
- `StatNode` — "BAB ≥ N", "STR ≥ 13", "caster level ≥ 5"
- `SkillNode` — "4 ranks in Tumble"
- `AndNode` — all children must be satisfied
- `OrNode` — any child must be satisfied
- `AlignmentNode` — alignment requirement
- `SpecialNode` — freetext special cases (flagged for manual handling)

```js
solve(node, character, contentPack, memo)
  → { met: boolean, unmet: Node[], chain: string[] }
```

Memoization prevents re-evaluating shared prerequisites (e.g. Point Blank Shot appearing under both Precise Shot and Arcane Archer directly).

**Consumer functions** delegate to the solver:
```js
// lib/rules/feat-prereqs.js
canTakeFeat(feat, character, contentPack)
  → { eligible: boolean, reasons: string[] }

// lib/rules/prestige-prereqs.js
canTakePrestigeClass(cls, character, contentPack)
  → { eligible: boolean, reasons: string[] }
```

The `reasons` array drives the "why is this locked" tooltip in the UI.

**Other rules functions:**
```js
getSkillBudget(character, contentPack)  → { total, spent, remaining }
getGestaltProgression(levels, contentPack) → { bab, fort, ref, will, hd }[]
getSpellSlots(levels, contentPack)      → { [className]: slots[][] }
calcPointBuyCost(scores)                → number
getFinalScores(base, race, levels)      → scores
```

---

## Sprint Plan

| Sprint | Deliverable | Tests |
|--------|-------------|-------|
| 0 | Content pack schema + `loadContentPacks` + codegen script (legacy JS → `.md`) | Loader unit tests + round-trip test |
| 1 | `CharacterContext` + `DmContext` + all reducers | Reducer unit tests |
| 2 | Identity tab (name, race picker, alignment, physical traits) | — |
| 3 | Abilities tab (4d6 / standard array / point buy) | `ability-scores.js` unit tests |
| 4 | Levels tab (gestalt class A+B per level, BAB/save progression) | `gestalt.js` unit tests |
| 5 | Skills tab (skill point budget, class skills, gestalt union rules) | `skill-budget.js` unit tests |
| 6 | Feats tab + FeatPicker modal (prereq solver, slot tracking) | `prereq-solver.js` + `feat-prereqs.js` unit tests |
| 7 | Spells tab (slots, spells known, psionics, warlock invocations) | `spell-slots.js` unit tests |
| 8 | Sheet tab + export (print / PDF / markdown) | Export format round-trip tests |
| 9 | DM Tools tab (content restrictions, password lock, campaign save/load) | Campaign round-trip test |

---

## Testing Strategy

- **Vitest** as test runner (fast, native ESM, works with Next.js)
- Tests live in `webapp/src/__tests__/rules/`
- Tests load **real content packs** from `content/` — no mocks. If data is malformed, tests break.
- Key test cases:
  - `prereq-solver`: known valid chains, known invalid (missing BAB), disjunctive `OrNode`, memoization
  - `skill-budget`: gestalt class-skill union, cross-class rank caps, INT modifier edge cases
  - `gestalt`: BAB stacking (best-of-two, not sum), save progression, HD selection
  - `spell-slots`: multi-class spellcaster stacking, sorcerer/bard spells-known table
  - `content-pack-loader`: round-trip (legacy JS → `.md` → loader → same object shape)

---

## Verification

Each sprint is verified before the next begins:

1. `cd webapp && npm test` — all tests pass
2. `npm run dev` — app loads at `localhost:3000`, newly implemented tab is functional
3. Cross-check against the legacy app (`python -m http.server 8080` → `localhost:8080/dnd35_gestalt_v4.html`) for feature parity
4. Sprint 0 specific: run `node scripts/codegen-content-packs.js` and confirm all content files are generated and loader tests pass

---

## Dependencies to Add

| Package | Purpose |
|---------|---------|
| `gray-matter` | YAML frontmatter parsing for content packs |
| `vitest` | Test runner |
| `@vitest/coverage-v8` | Coverage reporting |
