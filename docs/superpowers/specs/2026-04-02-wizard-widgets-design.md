# Wizard Widgets — Design Spec

_2026-04-02_

## Overview

Enhance the character creation wizard with purpose-built input widgets for fields that deserve richer UX than a plain text input. All widgets ultimately produce strings or numbers that map directly to fields on the D&D 3.5e PHB Character Record Sheet PDF (`sheet.pdf`). DM Tools exposes a global "Rule of Cool" override that disables all validation constraints.

---

## 1. Shared `IncrDecrControl` Component

**Location:** `src/components/primitives/IncrDecrControl.tsx`

A reusable bordered box with a centered value display and − / + buttons. Used in: manual ability score entry, point buy ±, age picker, and any future numeric field.

**Props:**

```ts
interface IncrDecrControlProps {
  value: number
  min?: number       // default: no lower bound (or 1 for abilities)
  max?: number       // default: no upper bound
  step?: number      // default: 1
  onChange: (value: number) => void
  disabled?: boolean
  label?: string     // optional Cinzel uppercase label above the control
  sublabel?: string  // optional modifier/annotation below (e.g. "+2 mod")
}
```

**Style:** Parchment-light background, gold-rule border, burgundy top stripe. Minus/plus buttons are square (22×22px), same border treatment. Value centered in a wider span. Disabled buttons fade to 30% opacity, no cursor change.

**PDF output:** Raw integer/number.

---

## 2. Ability Score Method Widgets

**Location:** `src/components/wizard/RollAbilitiesStep.tsx` and `src/components/wizard/AssignAbilitiesStep.tsx` (existing files, rebuilt interiors)

The method selector buttons at the top stay as-is. Each method now renders a distinct interactive widget below.

### 2a. Dice Roller (`roll` mode)

**Interaction:** Click "Roll" to roll one set of 4d6. The lowest die is shown faded/struck. Click again to roll the next of 6 sets. A "Re-roll All" button resets all 6.

**Animation:** CSS keyframe animation (`@keyframes diceSpin`) — a fast 200ms spin + bounce on the die element that just rolled. A **2D/3D toggle** sits above the dice area:

- **2D:** `rotateY(360deg)` flat spin
- **3D:** `rotateX(360deg) rotateY(360deg)` with `transform-style: preserve-3d` and a constructed cube (6 faces using pseudo-elements and `translateZ`). The 3D cube shows the number face landing upward.

Toggle state is local to the session (not persisted). Default: 2D.

**Output:** 6 scores stored as `rolledSets: number[][]` in wizard state, then assigned in the Assign step.

### 2b. Standard Array Drag-and-Drop (`array` mode)

**Interaction:** Fixed chips (15, 14, 13, 12, 10, 8) in a pool. Drag a chip onto an ability slot, or click a slot to cycle through unassigned values. Dropping onto an occupied slot swaps the values.

**Implementation:** HTML5 Drag-and-Drop API (`draggable`, `onDragStart`, `onDrop`). Touch fallback: tap chip to select it (highlighted), then tap slot to assign.

**Visual:** Chips styled as burgundy badges. Ability slots show `—` when empty, the value when filled. Selected (touch) chip has a gold outline.

**Output:** `abilities: Record<string, number>` fully assigned.

### 2c. Point Buy (`pointbuy` mode)

**Interaction:** Table layout matching the skills table aesthetic. Each row: ability name | current score | modifier | cost | − + buttons. Running "Points Remaining" counter shown as a prominent burgundy number above the table.

**Constraints:** Score range 8–18, total budget 27 pts (PHB costs). Buttons disable when at bounds or budget exhausted. Costs per the existing `POINT_BUY_COST` table in `src/lib/dnd35/constants.ts`.

**DM override:** When Rule of Cool is active, range extends to 3–30 with no budget cap.

**Output:** `abilities: Record<string, number>`.

### 2d. Manual Entry (`manual` mode)

**Interaction:** 6 cards in a 3-column grid, one per ability. Each card uses `IncrDecrControl`. Range 1–20 (no budget tracking). Modifier shown as sublabel, updates live.

**DM override:** Range extends to 1–30.

**Output:** `abilities: Record<string, number>`.

---

## 3. Alignment Widget

**Location:** `src/components/wizard/AlignmentGrid.tsx`

**Visual:** 3×3 grid of clickable cells. X-axis labels: Lawful · Neutral · Chaotic. Y-axis labels: Good · Neutral · Evil. Each cell shows full name ("Lawful Good") and abbreviation ("LG"). Selected cell fills burgundy with parchment text.

**Constraint:** If a selected class or deity imposes alignment restrictions, incompatible cells render at 40% opacity with a tooltip explaining the restriction.

**DM override:** All cells active regardless of class/deity restrictions.

**Output:** String — one of the 9 alignment names (e.g. `"Lawful Good"`, `"True Neutral"`, `"Chaotic Evil"`). Maps to `ALIGNMENT` text field on PDF.

---

## 4. Deity Selector

**Location:** `src/components/wizard/DeitySelector.tsx`

**Interaction:** Styled text input (matches `TextForm` input style). An HTML `<datalist>` provides autocomplete suggestions from a hardcoded list of ~40 common D&D 3.5e deities covering Greyhawk, Forgotten Realms, and Eberron pantheons (e.g. Pelor, Heironeous, Moradin, Corellon Larethian, Nerull, Wee Jas). Free text always allowed — `<datalist>` is advisory only.

**Future:** When deity entities exist in the content pack, `DeitySelector` will detect them and render the rich selector (artwork, lore, alignment hints) instead. The prop interface stays the same (`value: string, onChange: (v: string) => void`) so the swap is a drop-in.

**Output:** String. Maps to `DEITY` text field on PDF.

---

## 5. Color Selectors (Eye / Hair / Skin)

**Location:** `src/components/wizard/ColorPicker.tsx` (new, shared by all three fields)

**Props:**

```ts
interface ColorPickerProps {
  palette: Array<{ hex: string; label: string }>
  value: string       // the text label, not hex
  onChange: (label: string) => void
  placeholder?: string
}
```

**Interaction:**

- Row of swatch squares (26×26px). Click to select — updates the text input below to the swatch's label.
- Text input is always editable. Typing custom text clears the swatch selection. A small preview square beside the input mirrors the currently selected swatch color (or a neutral fallback for custom text).
- No restrictions. "Violet with gold flecks" is a valid value.

**Palettes** (defined in a constants file `src/lib/dnd35/colorPalettes.ts`):

- **Eye:** Dark Brown, Amber/Hazel, Green, Blue, Violet, Grey, Black, Amber, Red/Crimson, Silver/White, Teal, Gold
- **Hair:** Black, Dark Brown, Brown, Auburn, Blonde, Light Blonde, Red, Grey, White/Silver, Blue (magical), Green (magical), Purple (magical)
- **Skin:** Fair, Light, Medium, Tan, Brown, Dark Brown, Near-Black, Pale Green, Greenish, Lavender, Grey/Ash, Golden

**Output:** Text label string (e.g. `"Dark Brown"`, `"Violet with gold flecks"`). Maps to `EYES` / `HAIR` / `SKIN` text fields on PDF.

---

## 6. Age Picker

**Location:** `src/components/wizard/AgePicker.tsx`

**Props:**

```ts
interface AgePickerProps {
  value: number
  race: Entity | null    // used to read age milestones
  onChange: (age: number) => void
  unlocked?: boolean     // DM Rule of Cool override
}
```

**Interaction:**

- Range slider with tick marks at racial age milestones (mature, middle, old, venerable), read from `race.properties.age` array `[mature, middle, old, venerable]`.
- Current value shown prominently as a large number. A contextual label ("Young Adult", "Middle Age", "Old", "Venerable") updates based on which milestone band the value falls in.
- Direct numeric input (`IncrDecrControl`) alongside the slider for precision entry.
- Slider min: `0`. Slider max: `venerable + Math.ceil(venerable * 0.2)` (20% buffer above venerable age).

**DM override (`unlocked: true`):** Slider range becomes 0–10,000. Contextual label still shows if within normal range, otherwise shows "Beyond the Ages" (or equivalent flavour).

**Missing race data:** If `race.properties.age` is absent, slider is hidden and only the `IncrDecrControl` is shown with no bounds.

**Output:** Integer. Maps to `AGE` text field on PDF.

---

## 7. Sort Order Toggle

**Location:** `src/routes/EntityList.tsx` (existing file)

Replace the `<select>` dropdown with a single click-to-toggle button. Current sort order is displayed as the label; clicking cycles it.

**States:**

- `az`: button label `A → Z`
- `za`: button label `Z → A`

**Style:** Matches the existing filter pill buttons — Cinzel uppercase, gold border, burgundy active fill. A single click flips the value. No dropdown.

---

## 8. DM Rule of Cool Override

**Location:** DM Tools page (`src/components/DMTools.tsx` or equivalent), stored in existing DM settings via Tauri IPC.

**Mechanism:** A single boolean toggle "Rule of Cool" in DM settings. When enabled:

- Age picker: removes racial bounds (0–10,000 range)
- Alignment grid: all 9 cells active regardless of class/deity
- Ability scores: range extends to 3–30, point buy budget removed
- Any future constraint that opts into the override pattern

**Wizard integration:** Each constrained widget accepts an `unlocked?: boolean` prop. `CreationWizard.tsx` reads `dmSettings.ruleCool` (fetched once on mount via IPC) and passes it down.

**IPC:** Extends the existing `dm_settings` Tauri command — adds a `rule_cool: bool` field to the `DmSettings` struct in Rust.

---

## 9. PDF Compatibility Summary

All wizard fields produce values that render correctly in the PHB Character Record Sheet (`sheet.pdf`) text fields:

| Widget | Output type | PDF field |
|---|---|---|
| Alignment grid | String ("Lawful Good") | ALIGNMENT |
| Deity selector | String | DEITY |
| Eye color picker | String ("Dark Brown") | EYES |
| Hair color picker | String | HAIR |
| Skin color picker | String | SKIN |
| Age picker | Integer | AGE |
| Ability scores | 6 integers | STR/DEX/CON/INT/WIS/CHA |

No output type changes are required. The PDF renderer reads these same fields from the character entity properties.

---

## Component Map

```
src/components/primitives/
  IncrDecrControl.tsx          ← new, shared

src/components/wizard/
  AlignmentGrid.tsx             ← new
  DeitySelector.tsx             ← new
  ColorPicker.tsx               ← new (used for eyes/hair/skin)
  AgePicker.tsx                 ← new
  RollAbilitiesStep.tsx         ← rebuilt (dice roller + 2D/3D toggle)
  AssignAbilitiesStep.tsx       ← rebuilt (all 4 modes use new widgets)

src/routes/
  EntityList.tsx                ← sort toggle change only

src/lib/dnd35/
  colorPalettes.ts              ← new (swatch definitions)
  deities.ts                    ← new (suggestion list)

src-tauri/src/
  dm_settings.rs                ← add rule_cool: bool field
  ipc.rs                        ← expose rule_cool in get/set DM settings
```

---

## Out of Scope (Future)

- Rich deity entity cards (artwork, lore, alignment compatibility) — deferred to deity content pack
- Per-field DM validation toggles — deferred, use global Rule of Cool for now
- Deity alignment restriction enforcement — deferred with deity content pack
- 3D dice physics engine (Three.js/WebGL) — current 3D is CSS transform only
