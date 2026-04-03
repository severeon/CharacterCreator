# App Components Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a web-only "App Components" sidebar section that renders any wizard component in isolation with fixture data and logs callback payloads to an output panel.

**Architecture:** A shared `isTauri()` utility gates the feature; a component registry maps URL slugs to components + fixture props; a `ComponentPlayground` route renders the selected component and intercepts all `on*` callbacks to display their payloads in an output log below.

**Tech Stack:** React, React Router v7, TypeScript, TailwindCSS + inline styles (matching existing sidebar theme)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/isTauri.ts` | Shared `isTauri()` utility |
| Modify | `src/lib/engine.ts` | Import `isTauri` from shared util |
| Create | `src/dev/componentRegistry.tsx` | Registry of all wizard components + fixtures |
| Create | `src/routes/ComponentPlayground.tsx` | Route that renders component + output log |
| Modify | `src/components/Sidebar.tsx` | Add App Components section (web-only) |
| Modify | `src/App.tsx` | Add `/dev/components/:name` route (web-only) |

---

## Task 1: Extract `isTauri()` to shared utility

**Files:**
- Create: `src/lib/isTauri.ts`
- Modify: `src/lib/engine.ts` (lines 4–6 — remove private function, add import)

- [ ] **Step 1: Create `src/lib/isTauri.ts`**

```ts
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
```

- [ ] **Step 2: Update `src/lib/engine.ts` — replace local function with import**

Replace lines 1–6:
```ts
import { invoke } from '@tauri-apps/api/core'
import type { Entity, EntitySummary } from './types'

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}
```
With:
```ts
import { invoke } from '@tauri-apps/api/core'
import type { Entity, EntitySummary } from './types'
import { isTauri } from './isTauri'
```

- [ ] **Step 3: Verify the app still builds**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/isTauri.ts src/lib/engine.ts
git commit -m "refactor: extract isTauri() to shared utility"
```

---

## Task 2: Create the component registry

**Files:**
- Create: `src/dev/componentRegistry.tsx`

- [ ] **Step 1: Create `src/dev/componentRegistry.tsx`**

```tsx
import React from 'react'
import { RollAbilitiesStep } from '../components/wizard/RollAbilitiesStep'
import { AssignAbilitiesStep } from '../components/wizard/AssignAbilitiesStep'
import { AbilityAllocator } from '../components/wizard/AbilityAllocator'
import { AbilitiesStep } from '../components/wizard/AbilitiesStep'
import { RaceStep } from '../components/wizard/RaceStep'
import { ClassStep } from '../components/wizard/ClassStep'
import { FeatsStep } from '../components/wizard/FeatsStep'
import { FeatStep } from '../components/wizard/FeatStep'
import { SkillAllocator } from '../components/wizard/SkillAllocator'
import { SkillsStep } from '../components/wizard/SkillsStep'
import { StartingPackageStep } from '../components/wizard/StartingPackageStep'
import { RacialClassFeaturesStep } from '../components/wizard/RacialClassFeaturesStep'
import { CombatNumbersStep } from '../components/wizard/CombatNumbersStep'
import { EquipmentAllocator } from '../components/wizard/EquipmentAllocator'
import { DetailsStep } from '../components/wizard/DetailsStep'
import { DescriptionStep } from '../components/wizard/DescriptionStep'
import { TextForm } from '../components/wizard/TextForm'
import { NarrativeBlock } from '../components/wizard/NarrativeBlock'
import { NameStep } from '../components/wizard/NameStep'
import { ReviewStep } from '../components/wizard/ReviewStep'
import { AlignmentGrid } from '../components/wizard/AlignmentGrid'
import { ColorPicker, EYE_COLORS, HAIR_COLORS, SKIN_COLORS } from '../components/wizard/ColorPicker'
import { DeitySelector } from '../components/wizard/DeitySelector'
import { AgePicker } from '../components/wizard/AgePicker'
import { EntitySelector } from '../components/wizard/EntitySelector'
import type { Entity } from '../lib/types'

export interface RegistryEntry {
  label: string
  component: React.ComponentType<any>
  defaultProps: Record<string, unknown>
}

// Minimal stub entities used across multiple fixtures
const STUB_RACE: Entity = {
  id: 'srd:races:elf',
  entity_type: 'race',
  source_pack: 'srd-3.5e',
  tags: ['core'],
  mdx_body: '',
  properties: {
    name: 'Elf',
    description: 'Graceful and long-lived.',
    traits: ['Low-Light Vision', 'Elven Immunity', 'Keen Senses'],
    ecl: 0,
    age: [110, 120, 175, 350],
  },
}

const STUB_CLASS: Entity = {
  id: 'srd:classes:fighter',
  entity_type: 'class',
  source_pack: 'srd-3.5e',
  tags: ['core'],
  mdx_body: '',
  properties: {
    name: 'Fighter',
    description: 'Master of martial combat.',
    hd: 10,
    bab: 'full',
    fort: 'good',
    ref: 'poor',
    will: 'poor',
    features: ['Bonus Feat', 'Bonus Feat (2nd)'],
    skill_points: 2,
    starting_gold: 150,
  },
}

const STUB_FEAT: Entity = {
  id: 'srd:feats:power-attack',
  entity_type: 'feat',
  source_pack: 'srd-3.5e',
  tags: ['combat'],
  mdx_body: '',
  properties: {
    name: 'Power Attack',
    description: 'Trade attack bonus for damage.',
    prerequisites: ['STR 13'],
  },
}

const STUB_ABILITIES: Record<string, number> = {
  strength: 15,
  dexterity: 14,
  constitution: 13,
  intelligence: 12,
  wisdom: 10,
  charisma: 8,
}

export const componentRegistry: Record<string, RegistryEntry> = {
  // NOTE: on* props are included as `undefined` so the playground can wrap them.
  // The ComponentPlayground scans all keys starting with "on" and intercepts them.
  'roll-abilities': {
    label: 'RollAbilitiesStep',
    component: RollAbilitiesStep,
    defaultProps: {
      rolledSets: [[15, 14, 13, 12, 10, 8], [16, 13, 12, 11, 10, 9]],
      abilityMethod: 'roll',
      onRollAbilities: undefined,
      onStandardArray: undefined,
      onPointBuy: undefined,
      onManualEntry: undefined,
    },
  },
  'assign-abilities': {
    label: 'AssignAbilitiesStep',
    component: AssignAbilitiesStep,
    defaultProps: {
      abilities: STUB_ABILITIES,
      abilityMethod: 'array',
      pointBuyRemaining: 27,
      selectedClass: STUB_CLASS,
      unlocked: false,
      onRollAbilities: undefined,
      onStandardArray: undefined,
      onPointBuy: undefined,
      onManualEntry: undefined,
      onAbilityPointBuy: undefined,
      onAbilityManualChange: undefined,
    },
  },
  'ability-allocator': {
    label: 'AbilityAllocator',
    component: AbilityAllocator,
    defaultProps: {
      config: { mode: 'generate', show_racial_bonuses: false },
      rolledSets: [[15, 14, 13, 12, 10, 8]],
      abilityMethod: 'roll',
      pointBuyRemaining: 27,
      abilities: STUB_ABILITIES,
      selectedClass: STUB_CLASS,
      unlocked: false,
      onRollAbilities: undefined,
      onStandardArray: undefined,
      onPointBuy: undefined,
      onManualEntry: undefined,
      onAbilityPointBuy: undefined,
      onAbilityManualChange: undefined,
    },
  },
  'abilities-step': {
    label: 'AbilitiesStep',
    component: AbilitiesStep,
    defaultProps: {
      abilities: STUB_ABILITIES,
      abilityMethod: 'array',
      pointBuyRemaining: 27,
      selectedClass: STUB_CLASS,
      onRollAbilities: undefined,
      onStandardArray: undefined,
      onPointBuy: undefined,
      onManualEntry: undefined,
      onAbilityPointBuy: undefined,
      onAbilityManualChange: undefined,
      onAssignAbilities: undefined,
      onBack: undefined,
    },
  },
  'race': {
    label: 'RaceStep',
    component: RaceStep,
    defaultProps: {
      races: [STUB_RACE, { ...STUB_RACE, id: 'srd:races:human', properties: { ...STUB_RACE.properties, name: 'Human', description: 'Versatile and ambitious.', traits: ['Bonus Feat', 'Bonus Skill Points'] } }],
      selectedRace: null,
      onSelectRace: undefined,
    },
  },
  'class': {
    label: 'ClassStep',
    component: ClassStep,
    defaultProps: {
      classes: [STUB_CLASS, { ...STUB_CLASS, id: 'srd:classes:rogue', properties: { ...STUB_CLASS.properties, name: 'Rogue', hd: 6, bab: 'medium' } }],
      selectedClass: null,
      selectedClassB: null,
      isGestalt: false,
      onToggleGestalt: undefined,
      onSelectClass: undefined,
      onContinue: undefined,
      onBack: undefined,
    },
  },
  'feats-step': {
    label: 'FeatsStep',
    component: FeatsStep,
    defaultProps: {
      availableFeats: [STUB_FEAT, { ...STUB_FEAT, id: 'srd:feats:weapon-focus', properties: { ...STUB_FEAT.properties, name: 'Weapon Focus', description: 'Bonus to attack with one weapon.' } }],
      selectedFeats: [],
      featSlotsRemaining: 1,
      onSelectFeat: undefined,
      onContinue: undefined,
      onBack: undefined,
    },
  },
  'feat-step': {
    label: 'FeatStep',
    component: FeatStep,
    defaultProps: {
      availableFeats: [STUB_FEAT, { ...STUB_FEAT, id: 'srd:feats:weapon-focus', properties: { ...STUB_FEAT.properties, name: 'Weapon Focus', description: 'Bonus to attack with one weapon.' } }],
      selectedFeats: [],
      featSlotsRemaining: 1,
      onSelectFeat: undefined,
    },
  },
  'skill-allocator': {
    label: 'SkillAllocator',
    component: SkillAllocator,
    defaultProps: {
      config: { skills_ref: 'srd:skills' },
      abilities: STUB_ABILITIES,
      skillAllocations: {},
      classSkillNames: ['Climb', 'Jump', 'Swim', 'Intimidate'],
      skillPointsRemaining: 8,
      onAllocateSkill: undefined,
    },
  },
  'skills-step': {
    label: 'SkillsStep',
    component: SkillsStep,
    defaultProps: {
      abilities: STUB_ABILITIES,
      skillAllocations: {},
      classSkillNames: ['Climb', 'Jump', 'Swim', 'Intimidate'],
      skillPointsRemaining: 8,
      onAllocateSkill: undefined,
      onContinue: undefined,
      onBack: undefined,
    },
  },
  'starting-package': {
    label: 'StartingPackageStep',
    component: StartingPackageStep,
    defaultProps: {
      selectedClass: STUB_CLASS,
      onAccept: undefined,
      onCustomize: undefined,
      onBack: undefined,
    },
  },
  'racial-class-features': {
    label: 'RacialClassFeaturesStep',
    component: RacialClassFeaturesStep,
    defaultProps: {
      selectedRace: STUB_RACE,
      selectedClass: STUB_CLASS,
      onContinue: undefined,
      onBack: undefined,
    },
  },
  'combat-numbers': {
    label: 'CombatNumbersStep',
    component: CombatNumbersStep,
    defaultProps: {
      characterId: 'preview-char',
      abilities: STUB_ABILITIES,
      selectedClass: STUB_CLASS,
      selectedRace: STUB_RACE,
      onContinue: undefined,
      onBack: undefined,
    },
  },
  'equipment-allocator': {
    label: 'EquipmentAllocator',
    component: EquipmentAllocator,
    defaultProps: {
      config: { starting_gold_ref: 'srd:gold' },
      startingGold: 150,
      selectedClass: STUB_CLASS,
      selectedRace: STUB_RACE,
    },
  },
  'details': {
    label: 'DetailsStep',
    component: DetailsStep,
    defaultProps: {
      characterName: 'Thalindra',
      playerName: 'Thomas',
      alignment: 'Neutral Good',
      deity: 'Corellon Larethian',
      height: "5'6\"",
      weight: '110 lbs',
      age: 120,
      eyes: 'Amber',
      hair: 'Silver',
      skin: 'Pale',
      selectedRace: STUB_RACE,
      unlocked: false,
      onCharacterNameChange: undefined,
      onPlayerNameChange: undefined,
      onAlignmentChange: undefined,
      onDeityChange: undefined,
      onHeightChange: undefined,
      onWeightChange: undefined,
      onAgeChange: undefined,
      onEyesChange: undefined,
      onHairChange: undefined,
      onSkinChange: undefined,
    },
  },
  'description': {
    label: 'DescriptionStep',
    component: DescriptionStep,
    defaultProps: {
      appearance: 'Slender with silver hair and amber eyes.',
      background: 'A wandering scout from the Silverwood.',
      onAppearanceChange: undefined,
      onBackgroundChange: undefined,
    },
  },
  'text-form': {
    label: 'TextForm',
    component: TextForm,
    defaultProps: {
      config: { fields: ['name', 'appearance', 'background'] },
      values: { name: 'Thalindra', appearance: '', background: '' },
      onChange: undefined,
    },
  },
  'narrative-block': {
    label: 'NarrativeBlock',
    component: NarrativeBlock,
    defaultProps: {
      config: { text: 'Welcome, adventurer. Your legend begins now. Choose wisely, for the choices you make will echo through eternity.' },
    },
  },
  'name-step': {
    label: 'NameStep',
    component: NameStep,
    defaultProps: {
      characterName: 'Thalindra',
      playerName: 'Thomas',
      alignment: 'neutral-good',
      deity: '',
      height: '',
      weight: '',
      age: '',
      eyes: '',
      hair: '',
      skin: '',
      appearance: '',
      background: '',
      onCharacterNameChange: undefined,
      onPlayerNameChange: undefined,
      onAlignmentChange: undefined,
      onDeityChange: undefined,
      onHeightChange: undefined,
      onWeightChange: undefined,
      onAgeChange: undefined,
      onEyesChange: undefined,
      onHairChange: undefined,
      onSkinChange: undefined,
      onAppearanceChange: undefined,
      onBackgroundChange: undefined,
      onStartCreation: undefined,
    },
  },
  'review': {
    label: 'ReviewStep',
    component: ReviewStep,
    defaultProps: {
      characterName: 'Thalindra',
      selectedRace: STUB_RACE,
      selectedClass: STUB_CLASS,
      abilities: STUB_ABILITIES,
      onFinish: undefined,
      onBack: undefined,
    },
  },
  'alignment-grid': {
    label: 'AlignmentGrid',
    component: AlignmentGrid,
    defaultProps: {
      value: 'Neutral Good',
      restrictions: [],
      unlocked: false,
      onChange: undefined,
    },
  },
  'color-picker': {
    label: 'ColorPicker',
    component: ColorPicker,
    defaultProps: {
      palette: EYE_COLORS,
      value: 'Amber',
      placeholder: 'Select eye color',
      label: 'Eye Color',
      onChange: undefined,
    },
  },
  'deity-selector': {
    label: 'DeitySelector',
    component: DeitySelector,
    defaultProps: {
      value: '',
      onChange: undefined,
    },
  },
  'age-picker': {
    label: 'AgePicker',
    component: AgePicker,
    defaultProps: {
      value: 120,
      race: STUB_RACE,
      unlocked: false,
      onChange: undefined,
    },
  },
  'entity-selector': {
    label: 'EntitySelector',
    component: EntitySelector,
    defaultProps: {
      config: { entity_type: 'race', display: 'card-grid', filter_eligible: false },
      entities: [STUB_RACE, { ...STUB_RACE, id: 'srd:races:human', properties: { ...STUB_RACE.properties, name: 'Human' } }],
      selectedIds: [],
      onSelect: undefined,
    },
  },
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/dev/componentRegistry.tsx
git commit -m "feat: add component registry with wizard fixtures"
```

---

## Task 3: Create the ComponentPlayground route

**Files:**
- Create: `src/routes/ComponentPlayground.tsx`

- [ ] **Step 1: Create `src/routes/ComponentPlayground.tsx`**

```tsx
import { useState, useMemo } from 'react'
import { useParams } from 'react-router'
import { componentRegistry } from '../dev/componentRegistry'

interface LogEntry {
  ts: string
  name: string
  args: unknown[]
}

function timestamp(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ComponentPlayground() {
  const { name } = useParams<{ name: string }>()
  const [log, setLog] = useState<LogEntry[]>([])

  const entry = name ? componentRegistry[name] : undefined

  // Wrap all on* callback keys so payloads are captured in the log.
  // Each registry entry includes on* props as `undefined` so they appear in the scan.
  const wrappedProps = useMemo(() => {
    if (!entry) return {}
    const props: Record<string, unknown> = { ...entry.defaultProps }
    for (const key of Object.keys(props)) {
      if (key.startsWith('on')) {
        const original = props[key]
        props[key] = (...args: unknown[]) => {
          setLog((prev) => [{ ts: timestamp(), name: key, args }, ...prev])
          if (typeof original === 'function') original(...args)
        }
      }
    }
    return props
  }, [entry])

  if (!entry) {
    return (
      <div style={{ padding: '2rem', fontFamily: "'Cinzel', serif", color: 'var(--gold-dim, #B8954A)' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Component not found</h2>
        <p style={{ fontSize: '0.8rem', color: 'rgba(184,149,74,0.6)' }}>
          No registry entry for <code>"{name}"</code>. Check <code>src/dev/componentRegistry.tsx</code>.
        </p>
      </div>
    )
  }

  const Component = entry.component

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Component area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '0.6rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(184,149,74,0.5)',
          }}>
            App Components
          </span>
          <span style={{
            fontFamily: "'Libre Baskerville', serif",
            fontSize: '0.75rem',
            color: 'rgba(184,149,74,0.8)',
          }}>
            {entry.label}
          </span>
        </div>
        <Component {...wrappedProps} />
      </div>

      {/* Output log panel */}
      <div style={{
        borderTop: '1px solid rgba(184,149,74,0.2)',
        background: 'rgba(0,0,0,0.25)',
        flexShrink: 0,
        maxHeight: '220px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.4rem 1rem',
          borderBottom: '1px solid rgba(184,149,74,0.15)',
        }}>
          <span style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '0.55rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(184,149,74,0.5)',
          }}>
            Output
          </span>
          {log.length > 0 && (
            <button
              type="button"
              onClick={() => setLog([])}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Cinzel', serif",
                fontSize: '0.55rem',
                color: 'rgba(184,149,74,0.45)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '2px 4px',
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div style={{ overflow: 'auto', flex: 1, padding: '0.5rem 1rem' }}>
          {log.length === 0 ? (
            <p style={{
              fontFamily: "'IM Fell English', Georgia, serif",
              fontSize: '0.65rem',
              fontStyle: 'italic',
              color: 'rgba(184,149,74,0.3)',
              margin: 0,
            }}>
              Interact with the component to see callback output here.
            </p>
          ) : (
            log.map((entry, i) => (
              <div key={i} style={{ marginBottom: '0.5rem' }}>
                <div style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.6rem',
                  color: 'rgba(184,149,74,0.6)',
                  marginBottom: '2px',
                }}>
                  {entry.ts} &nbsp; <span style={{ color: '#D4B468' }}>{entry.name}</span>
                </div>
                <pre style={{
                  margin: 0,
                  fontFamily: '"Fira Code", "Courier New", monospace',
                  fontSize: '0.65rem',
                  color: 'rgba(242,228,196,0.8)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {JSON.stringify(entry.args.length === 1 ? entry.args[0] : entry.args, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/routes/ComponentPlayground.tsx
git commit -m "feat: add ComponentPlayground route with output log"
```

---

## Task 4: Update Sidebar with App Components section

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Add import and App Components section to `src/components/Sidebar.tsx`**

Add `import { isTauri } from '../lib/isTauri'` after line 1 (`import { NavLink } from 'react-router'`):

```ts
import { NavLink } from 'react-router'
import { isTauri } from '../lib/isTauri'
import { componentRegistry } from '../dev/componentRegistry'
```

Add the following block inside the `<div style={{ padding: '1.4rem 1rem 1rem', ... }}>` container, immediately before the closing `</div>` of the padding div (after the `</ul>` closing the ENTITY_TYPES list, around line 145):

```tsx
        {/* App Components section — web only */}
        {!isTauri() && (
          <>
            {/* Gold rule */}
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #9A7B2C, transparent)', margin: '1rem 0 0.6rem' }} />

            {/* Section label */}
            <div style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '0.55rem',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(184, 149, 74, 0.55)',
              marginBottom: '0.6rem',
              paddingLeft: '2px',
            }}>
              App Components
            </div>

            {/* Component nav items */}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {Object.entries(componentRegistry).map(([slug, entry]) => (
                <li key={slug}>
                  <NavLink
                    to={`/dev/components/${slug}`}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontFamily: "'Cinzel', serif",
                      fontSize: '0.65rem',
                      fontWeight: isActive ? 600 : 400,
                      letterSpacing: '0.06em',
                      textDecoration: 'none',
                      padding: '4px 10px',
                      borderRadius: '2px',
                      borderLeft: `3px solid ${isActive ? '#8B2020' : 'transparent'}`,
                      background: isActive ? 'rgba(107, 20, 20, 0.3)' : 'transparent',
                      color: isActive ? '#F2E4C4' : 'rgba(212, 180, 104, 0.55)',
                      transition: 'all 0.12s',
                    })}
                  >
                    {entry.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add App Components section to sidebar (web-only)"
```

---

## Task 5: Register the route in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add import to `src/App.tsx`**

After the existing `import DMTools ...` line, add:

```tsx
import { isTauri } from './lib/isTauri'
import ComponentPlayground from './routes/ComponentPlayground'
```

- [ ] **Step 2: Add route inside `<Routes>` in `src/App.tsx`**

After the `<Route path="/:entityType/:id" .../>` line and before the closing `</Routes>`, add:

```tsx
              {!isTauri() && (
                <Route path="/dev/components/:name" element={<ComponentPlayground />} />
              )}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: register /dev/components/:name route (web-only)"
```

---

## Task 6: End-to-end verification

- [ ] **Step 1: Start the web dev server**

```bash
npx vite dev
```
Expected: server starts, no build errors in console

- [ ] **Step 2: Verify sidebar shows App Components section**

Open `http://localhost:5173/races`. Confirm "App Components" section is visible below "Compendium" with all 27 component entries listed.

- [ ] **Step 3: Verify a component renders**

Click "RollAbilitiesStep" in the sidebar. Confirm:
- URL changes to `/dev/components/roll-abilities`
- The component renders with its method selector buttons
- An empty output panel appears below with italic placeholder text

- [ ] **Step 4: Verify callback logging**

Click one of the ability method buttons (e.g. "Standard Array"). Confirm:
- The output panel shows a timestamped entry
- Callback name (e.g. `onStandardArray`) is displayed in gold
- Any arguments are shown as JSON (or `[]` for no-arg callbacks)

- [ ] **Step 5: Verify Clear button**

Click "Clear" in the output panel header. Confirm the log resets to the placeholder text.

- [ ] **Step 6: Verify unknown slug**

Navigate to `http://localhost:5173/dev/components/nonexistent`. Confirm "Component not found" message with the slug displayed.

- [ ] **Step 7: Run existing tests to verify no regressions**

```bash
npx vitest run
```
Expected: all tests pass (no new failures)

- [ ] **Step 8: Run Rust tests**

```bash
cd src-tauri && cargo test
```
Expected: all 59 tests pass
