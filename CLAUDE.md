# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Tauri v2 desktop application for browsing D&D 3.5e content (classes, races, feats, spells). Built with Rust backend + React/TypeScript frontend. The app loads content packs of MDX entity files and presents them in a searchable, filterable browser.

A legacy single-page HTML character creator (`app.html`) also lives in this repo and serves as the data source for codegen.

## Running Locally

```sh
# Tauri dev mode (Rust backend + Vite frontend)
cargo tauri dev

# Frontend only (no Tauri IPC)
npx vite dev

# Legacy character creator
python -m http.server 8080
# then open http://localhost:8080/app.html
```

## Project Structure

| Path | Role |
|------|------|
| `src-tauri/` | Rust backend — entity store, pack loader, Tauri IPC commands |
| `src/` | React + TypeScript frontend — Vite, TailwindCSS, routes, components |
| `src/hooks/` | React hooks — `useWorkflow` (workflow lookup by ID) |
| `src/workflows/` | Workflow definition constants — `character-creation.ts` |
| `content/packs/srd-3.5e/` | SRD 3.5e content pack — manifest.yaml + ~960 MDX entity files |
| `scripts/codegen/` | Node scripts that generate MDX entities from legacy JS data files |
| `app.html` | Legacy character creator (single-page app, codegen data source) |
| `classes.js` | Legacy data file — races, classes, prestige prereqs (used by codegen) |
| `feats.js` | Legacy feat definitions (used by codegen) |
| `spells.js` | Legacy spell data (used by codegen) |

## Architecture

### Tauri App (Milestone 1: Content Browser + Milestone 2: Character Creation)

- **Rust backend** (`src-tauri/src/`): Event-sourced engine. `pack_loader` parses manifest.yaml + MDX entities into memory. `engine/` holds the Engine struct with modules for abilities, character, feats, skills, selection, export. `dispatch/` is the command dispatcher (Dispatcher, predicate, stack). `computed_view.rs`, `workflow.rs`, `queue.rs`, `subscription.rs` support character creation workflow. `ipc.rs` exposes 18 Tauri IPC commands (entity browser + full character creation: `create_character`, `select_race`, `select_class`, `assign_ability_scores`, `allocate_skill_points`, `select_feat`, `get_workflow_status`, `get_available_choices`, `get_speculative_state`, DM settings, JSON/markdown export).
- **React frontend** (`src/`): Vite + React + TypeScript + TailwindCSS. Routes: `/` → `/races`, `/:entityType` (entity list), `/:entityType/:id` (entity detail), `/creation` (character creation wizard), `/character/:id` (character sheet). Sidebar with type filters and search. MDX body rendered from entity content.
- **Character Creation Wizard** (`src/routes/CreationWizard.tsx`): Multi-step wizard driven by `WorkflowStepper` (`src/components/wizard/WorkflowStepper.tsx`) and the `useWorkflow` hook (`src/hooks/useWorkflow.ts`). The workflow is defined as a TypeScript constant (`src/workflows/character-creation.ts`) — future: loaded from content pack entities via IPC. Step components in `src/components/wizard/`: `AbilityAllocator`, `EntitySelector`, `SkillAllocator`, `TextForm`, `EquipmentAllocator`, `NarrativeBlock` (generic step UIs), plus existing domain steps (`RollAbilitiesStep`, `AssignAbilitiesStep`, `SkillsStep`, etc.). Steps: roll abilities → race → class → assign abilities → starting package → racial/class features → skills → feats → description → equipment → combat numbers → details.
- **Content packs** (`content/packs/`): Each pack has a `manifest.yaml` and an `entities/` directory of `.mdx` files organized by type (classes/, races/, feats/, spells/).

### Legacy Character Creator

Everything lives in `app.html`. Key structural regions (searchable by comment):

- **`INLINE DATA FALLBACK`** — copy of the `classes.js` arrays embedded for offline use.
- **`SPELLCASTING DATA`** (~line 4339) — spell slots, spells known, power points, spell/power libraries.
- **Render functions** — `renderLevels()`, `renderSkills()`, `renderFeats()`, `renderSpells()`, `renderSheet()`, `renderAbilities()`.
- **State object `S`** — single global object holding all character data.
- **DM object `DM`** — campaign-level settings.

## Running Tests

```sh
# Rust tests (59 tests)
cd src-tauri && cargo test

# Frontend tests (70 tests across 17 files, via Vitest)
npx vitest run

# Run a single test file
npx vitest run src/components/wizard/WorkflowStepper.test.tsx

# Codegen tests (2 tests, Node native test runner)
node --test scripts/codegen/tests/arcanum.test.mjs
```

## Codegen

To regenerate content from legacy data:

```sh
node scripts/codegen/run.mjs
```

This reads `classes.js`, `feats.js`, and `spells.js`, then writes MDX files to `content/packs/srd-3.5e/entities/`.

## CI

GitHub Actions:
- `ci.yml` — runs frontend Vitest, Rust `cargo test`, Linux Tauri build, and Playwright e2e on push/PR to main
- `claude.yml` — runs Claude Code on issues/PRs when tagged with `@claude`
- `opencode.yml` — runs OpenCode when a comment starts with `/oc` or `/opencode`
