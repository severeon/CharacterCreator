# Entity Component System

## Problem

The current frontend uses a single generic `PropertyTable` + `MdxRenderer` for all entity types (races, classes, feats, spells, skills). List cards show only name+tags. Detail views dump raw key-value pairs. Wizard step cards have inline JSX with no reuse.

## Goal

Create canonical React components for each entity type × rendering context. Components live in `src/components/entities/` and are injected into MdxRenderer as an MDX component registry.

## Entity Types

races, classes, feats, spells, skills

## Component Views Per Type

| View | Purpose | Props |
|------|---------|-------|
| Card | List browse grid card | `{ entity: Entity }` |
| Detail | Full property display (replaces PropertyTable in detail routes) | `{ entity: Entity }` |
| InlineRef | Compact chip/link for cross-references | `{ entity: EntitySummary }` |
| WizardCard | Selection card in creation wizard | `{ entity: Entity; selected?: boolean; onSelect?: (id: string) => void }` |

Note: spell/ and skill/ have no WizardCard (not selected in wizard).

## Directory Structure

```
src/components/entities/
  feat/    Card, Detail, InlineRef, WizardCard, index.ts
  spell/   Card, Detail, InlineRef, index.ts
  race/    Card, Detail, InlineRef, WizardCard, index.ts
  class/   Card, Detail, InlineRef, WizardCard, index.ts
  skill/   Card, Detail, InlineRef, index.ts
  registry.ts
```

## Props Contract

- All Card/Detail/WizardCard receive `entity: Entity` (raw, from lib/types.ts)
- Use `getPropertyString()` / `getPropertyNumber()` from lib/properties.ts
- InlineRef receives `entity: EntitySummary`
- WizardCard also accepts `selected?: boolean` and `onSelect?: (id: string) => void`

## MDX Registry

`registry.ts` exports `entityComponents` mapping — passed as `components` prop to MDXContent in MdxRenderer.tsx. MDX files can use components like `<FeatDetail />`, `<RaceInlineRef />` without imports.

## What Each View Renders Per Type

**Feat:**
- Card: name, tags (combat/fighter/etc)
- Detail: prerequisites (ability scores, BAB, feats required), benefit, classes that get it as bonus feat
- InlineRef: `[Feat] Power Attack` chip
- WizardCard: name, truncated benefit, selected indicator

**Spell:**
- Card: name, school, level, casting classes
- Detail: school, level, all casting classes
- InlineRef: `[Spell] Fireball` chip

**Race:**
- Card: name, size, LA, ability bonus highlights
- Detail: ability bonuses table, traits list, physical stats (size/height/weight/age), proficiencies
- InlineRef: `[Race] Human` chip
- WizardCard: name, size, speed, key ability bonuses

**Class:**
- Card: name, HD, BAB, saves summary
- Detail: HD/BAB/saves, skill points, class skills, special abilities, variants list
- InlineRef: `[Class] Fighter` chip
- WizardCard: name, HD, BAB (gestalt-aware)

**Skill:**
- Card: name, key ability
- Detail: key ability, trained only status, synergies
- InlineRef: `[Skill] Spot` chip

## Files Modified

- `src/routes/EntityDetail.tsx` — replace PropertyTable with type-specific Detail component
- `src/routes/EntityList.tsx` — replace generic card with type-specific Card component
- `src/components/MdxRenderer.tsx` — pass entityComponents registry to MDXContent
- `src/components/wizard/RaceStep.tsx` — use RaceWizardCard
- `src/components/wizard/ClassStep.tsx` — use ClassWizardCard
- `src/components/wizard/FeatsStep.tsx` — use FeatWizardCard

## Verification

```sh
npx tsc --noEmit
npx vitest run
```
