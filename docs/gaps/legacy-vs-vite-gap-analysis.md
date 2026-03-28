# Legacy Prototype vs. Vite Implementation Gap Analysis

**Date:** 2026-03-28
**Legacy Prototype:** `app.html` (Hoyt's D&D 3.5 Gestalt Character Creator)
**Current Vite Impl:** Tauri v2 + React/TypeScript app (milestone-2 worktree)
**Goal:** 80% feature parity for Phase 1

---

## High-Level Summary

The legacy prototype is a fully-functional, single-file character creator with deep D&D 3.5e rule integration. The Vite implementation is a Tauri-based content browser with an incomplete creation wizard. The content browser (races, classes, feats, spells) is non-functional — no entities load due to Tauri IPC errors. The creation wizard exists as scaffolding but lacks integration with the Rust backend.

---

## Gap Map: Feature-by-Feature

### 1. Identity Tab

| Feature | Legacy | Vite |
|---------|--------|------|
| Character Name | ✅ text input | ❌ missing (wizard only) |
| Player Name | ✅ text input | ❌ missing |
| Alignment (9-grid) | ✅ clickable grid | ❌ missing |
| Deity | ✅ text input | ❌ missing |
| Height/Weight/Age | ✅ spinbuttons | ❌ missing |
| Eyes/Hair/Skin | ✅ text inputs | ❌ missing |
| Race selection | ✅ dropdown with LA, ECL | ❌ (content browser broken) |
| Racial Template | ✅ optional stacking template | ❌ missing |
| ECL display | ✅ calculated live | ❌ missing |
| Appearance textarea | ✅ multiline | ❌ missing |
| Background textarea | ✅ multiline | ❌ missing |

**Gap:** Identity captures ~14 fields. Vite has zero of these.

---

### 2. Abilities Tab

| Feature | Legacy | Vite |
|---------|--------|------|
| Base ability scores (STR-CHA) | ✅ spinbuttons 3-18 | ❌ missing |
| Modifier display | ✅ auto-calculated | ❌ missing |
| Roll 4d6 (auto-assign) | ✅ button | ❌ missing |
| Standard Array | ✅ button (15/14/13/12/10/8) | ✅ partial (hardcoded in review) |
| Point Buy | ✅ button | ❌ missing |
| Final scores (with race/template) | ✅ live update | ❌ missing |
| Derived stats (HP, BAB, saves) | ✅ live update | ❌ missing |
| Initiative, AC, Speed | ✅ displayed | ❌ missing |

**Gap:** Abilities section is entirely missing from Vite. The creation wizard has a hardcoded standard array on the review step only.

---

### 3. Levels Tab (Gestalt Engine)

| Feature | Legacy | Vite |
|---------|--------|------|
| Per-level Class A picker | ✅ dropdown | ❌ missing |
| Per-level Class B picker | ✅ dropdown | ❌ missing |
| Racial HD locking (Class A) | ✅ auto-locks Class A for RHD levels | ❌ missing |
| ECL calculation | ✅ live | ❌ missing |
| BAB/saves per level | ✅ columnar display | ❌ missing |
| Gestalt totals panel | ✅ HD, Base Attack, Fort/Ref/Will, ECL, HP, Skill Pts, Feats Avail | ❌ missing |
| Class skill union | ✅ displayed | ❌ missing |
| Level-by-level progression table | ✅ full table | ❌ missing |

**Gap:** This is the core differentiator of the legacy app. Gestalt dual-class tracking per level is entirely absent.

---

### 4. Skills Tab

| Feature | Legacy | Vite |
|---------|--------|------|
| Skill points tracker | ✅ spent/available | ✅ in wizard (hardcoded) |
| Skill filter | ✅ text input | ❌ missing |
| Show all skills toggle | ✅ checkbox | ❌ missing |
| Class skill marking | ✅ indicator | ✅ partial (in wizard) |
| Per-skill allocation | ✅ +/- controls | ✅ in wizard (simplified) |
| Cross-class skill cost | ✅ 2x for non-class | ✅ in wizard |
| Max ranks enforcement | ✅ per-level rules | ✅ in wizard |
| Skill total display | ✅ ranks + ability mod | ❌ missing |

**Gap:** Skills exist in the wizard but use hardcoded skill lists rather than from content. No filter or "show all" toggle.

---

### 5. Feats Tab

| Feature | Legacy | Vite |
|---------|--------|------|
| Feat slot tracker | ✅ slots/filled | ✅ in wizard |
| Level 1 feat slot | ✅ dedicated | ✅ in wizard |
| Human bonus feat | ✅ separate slot | ❌ missing |
| Feat picker dialog | ✅ modal per slot | ❌ missing |
| Prerequisite enforcement | ✅ checkbox in DM tools | ❌ missing |
| Standard progression (1,3,6,9,12,15,18) | ✅ displayed | ❌ missing |
| Feat Slot Summary | ✅ breakdown by source | ❌ missing |

**Gap:** Feat selection UI is entirely missing. Wizard shows available feats but cannot actually pick them (API error).

---

### 6. Spells Tab

| Feature | Legacy | Vite |
|---------|--------|------|
| Spell slot table | ✅ per-level slots | ❌ missing |
| Bonus slots from ability | ✅ auto-calculated | ❌ missing |
| Racial spell-like abilities | ✅ auto-detected | ❌ missing |
| Psionic powers support | ✅ separate section | ❌ missing |
| Invocations | ✅ supported | ❌ missing |
| Spell refresh button | ✅ | ❌ missing |

**Gap:** Spell system entirely absent.

---

### 7. Sheet Tab (Export/Print)

| Feature | Legacy | Vite |
|---------|--------|------|
| Character summary | ✅ full sheet | ❌ (no character to display) |
| Print / Export PDF | ✅ | ❌ missing |
| Save as Markdown | ✅ | ❌ missing |
| Export classes.json | ✅ | ❌ missing |
| Skills table (* = class skill) | ✅ | ❌ missing |
| Level progression table | ✅ | ❌ missing |
| Racial Traits display | ✅ | ❌ missing |
| Class Features display | ✅ | ❌ missing |
| Proficiencies | ✅ | ❌ missing |

**Gap:** Export/print entirely missing.

---

### 8. DM Tools Panel

| Feature | Legacy | Vite |
|---------|--------|------|
| DM Tools panel | ✅ collapsible | ❌ missing |
| Content Manager | ✅ browse/restrict/enable per entity | ❌ missing |
| Ability Score Method | ✅ radio (manual/array/point buy/roll) | ❌ missing |
| Stat limits (max 18) | ✅ checkbox | ❌ missing |
| Campaign Restrictions | ✅ checkboxes (gestalt, templates, LA, racial HD, ECL max) | ❌ missing |
| Enforce feat prerequisites | ✅ checkbox | ❌ missing |
| Enforce prestige entry reqs | ✅ checkbox | ❌ missing |
| Max ECL slider | ✅ 1-40 | ❌ missing |
| DM Password lock | ✅ | ❌ missing |
| Notes for Players | ✅ textarea | ❌ missing |
| External classes.json loader | ✅ drag-drop | ❌ missing |

**Gap:** DM tools panel is entirely absent. This is a significant feature for campaign management.

---

### 9. Content Browser (Milestone 1 Feature)

| Feature | Legacy | Vite |
|---------|--------|------|
| Race listing | ✅ in DM tools | ❌ broken (IPC errors) |
| Class listing | ✅ in DM tools | ❌ broken (IPC errors) |
| Feat listing | ✅ in DM tools | ❌ broken (IPC errors) |
| Spell listing | ✅ in DM tools | ❌ broken (IPC errors) |
| Entity detail view | N/A | ✅ partial (but empty) |
| Search/filter | ✅ in DM tools | ✅ search box (non-functional) |
| Entity MDX rendering | N/A | ✅ (MDX content not loading) |

**Gap:** Content browser shows "No entities found" — the Tauri IPC calls for `get_entities_by_type` and `get_available_choices` are failing silently.

---

## Root Cause Analysis: Why Content Isn't Loading

The content browser and creation wizard both fail because of Tauri IPC errors. Examining the console:

```
engine.ts:53 - getAvailableChoices() returns Promise that rejects
CreationWizard.tsx:73 - Promise.all([
  getAvailableChoices('', 'race'),  // ← called with empty characterId ''
  getAvailableChoices('', 'class'), // ← empty string is invalid
])
```

The `loadContent()` function in `CreationWizard.tsx` calls `getAvailableChoices` with an empty string `''` as `characterId`. The Rust backend likely requires a valid character ID or doesn't handle this gracefully.

Additionally, the content browser (`/races`, `/classes`, `/feats`, `/spells`) shows "No entities found" — meaning either:
1. The Rust backend isn't loading content packs properly, or
2. The IPC commands `get_entities_by_type` aren't implemented or failing

---

## What's Working in Vite

1. **Routing** — React Router navigation works
2. **Creation Wizard scaffold** — 7-step wizard UI exists (name → race → class → abilities → skills → feats → review)
3. **Sidebar navigation** — Content links (Races, Classes, Feats, Spells) render correctly
4. **UI components** — TailwindCSS styling, responsive layout
5. **Skill allocation UI** — Per-skill +/- buttons exist (though data is hardcoded)

---

## Prioritized Gap List for 80% Parity (Phase 1)

### P0 — Must Fix (Blockers)
1. **Fix Tauri IPC** — Make content load. This blocks all content browser features.
2. **Rust content loading** — Verify pack loader parses MDX files correctly.

### P1 — Core Character Creation (Wizard completion)
3. Identity step — Add player name, alignment grid, deity, physical characteristics
4. Race selection — Wire up to content browser entities
5. Class selection — Wire up to content browser entities
6. Abilities step — Add base score inputs, roll/array/point buy buttons, final score calculation
7. Level selection — Add gestalt dual-class per-level picker
8. Derived stats — HP, BAB, saves, initiative, AC, speed calculations
9. Spell slots — Per-class spell table, bonus slots from ability

### P2 — DM Tools & Content Management
10. DM Tools panel — Collapsible with campaign settings
11. Content Manager — Browse & restrict entities
12. External class loader — Drag-drop classes.json

### P3 — Export & Polish
13. Sheet/Print view — Full character summary
14. Export to Markdown/PDF/JSON
15. Racial templates

---

## Out of Scope for Phase 1 (20% to defer)
- Prestige class entry requirements enforcement
- Psionic powers and manifestations
- Racial HD gestalt locking (Class A = RHD for early levels)
- Level-up ability boosts (Levels 4/8/12/16/20)
- DM password protection
- Custom content pack loading

---

## Screenshots Captured

| File | Description |
|------|-------------|
| `legacy-prototype.png` | Identity tab |
| `legacy-abilities.png` | Abilities tab |
| `legacy-levels.png` | Levels (gestalt) tab |
| `legacy-skills.png` | Skills tab |
| `legacy-feats.png` | Feats tab |
| `legacy-spells.png` | Spells tab |
| `legacy-sheet.png` | Sheet/export tab |
| `legacy-dmtools.png` | DM tools panel |
| `legacy-content-manager.png` | Content manager sub-panel |
| `legacy-browse-restrict.png` | Browse & restrict races (156 races!) |
| `vite-current.png` | Vite app races page (broken) |
| `vite-creation.png` | Vite creation wizard step 1 |
