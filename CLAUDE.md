# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Tauri v2 desktop application for browsing D&D 3.5e content (classes, races, feats, spells). Built with Rust backend + React/TypeScript frontend. The app loads content packs of MDX entity files and presents them in a searchable, filterable browser.

A legacy single-page HTML character creator (`dnd35_gestalt_v4.html`) also lives in this repo and serves as the data source for codegen.

## Running Locally

```sh
# Tauri dev mode (Rust backend + Vite frontend)
cargo tauri dev

# Frontend only (no Tauri IPC)
npx vite dev

# Legacy character creator
python -m http.server 8080
# then open http://localhost:8080/dnd35_gestalt_v4.html
```

## Project Structure

| Path | Role |
|------|------|
| `src-tauri/` | Rust backend — entity store, pack loader, Tauri IPC commands |
| `src/` | React + TypeScript frontend — Vite, TailwindCSS, routes, components |
| `content/packs/srd-3.5e/` | SRD 3.5e content pack — manifest.yaml + ~960 MDX entity files |
| `scripts/codegen/` | Node scripts that generate MDX entities from legacy JS data files |
| `dnd35_gestalt_v4.html` | Legacy character creator (single-page app, codegen data source) |
| `classes.js` | Legacy data file — races, classes, prestige prereqs (used by codegen) |
| `feats.js` | Legacy feat definitions (used by codegen) |
| `spells.js` | Legacy spell data (used by codegen) |

## Architecture

### Tauri App (Milestone 1: Content Browser + Milestone 2: Character Creation)

- **Rust backend** (`src-tauri/src/`): Event-sourced engine. `pack_loader` parses manifest.yaml + MDX entities into memory. `engine/` holds the Engine struct with modules for abilities, character, feats, skills, selection, export. `dispatch/` is the command dispatcher (Dispatcher, predicate, stack). `computed_view.rs`, `workflow.rs`, `queue.rs`, `subscription.rs` support character creation workflow. `ipc.rs` exposes 18 Tauri IPC commands (entity browser + full character creation: `create_character`, `select_race`, `select_class`, `assign_ability_scores`, `allocate_skill_points`, `select_feat`, `get_workflow_status`, `get_available_choices`, `get_speculative_state`, DM settings, JSON/markdown export).
- **React frontend** (`src/`): Vite + React + TypeScript + TailwindCSS. Routes: `/` → `/races`, `/:entityType` (entity list), `/:entityType/:id` (entity detail), `/creation` (character creation wizard), `/character/:id` (character sheet). Sidebar with type filters and search. MDX body rendered from entity content.
- **Character Creation Wizard** (`src/routes/CreationWizard.tsx`): Multi-step wizard with components in `src/components/wizard/`. Steps: roll abilities → name/details → race → class → assign abilities → skills → feats → starting package → racial/class features → description → equipment → combat numbers.
- **Content packs** (`content/packs/`): Each pack has a `manifest.yaml` and an `entities/` directory of `.mdx` files organized by type (classes/, races/, feats/, spells/).

### Legacy Character Creator

Everything lives in `dnd35_gestalt_v4.html`. Key structural regions (searchable by comment):

- **`INLINE DATA FALLBACK`** — copy of the `classes.js` arrays embedded for offline use.
- **`SPELLCASTING DATA`** (~line 4339) — spell slots, spells known, power points, spell/power libraries.
- **Render functions** — `renderLevels()`, `renderSkills()`, `renderFeats()`, `renderSpells()`, `renderSheet()`, `renderAbilities()`.
- **State object `S`** — single global object holding all character data.
- **DM object `DM`** — campaign-level settings.

## Running Tests

```sh
# Rust tests (59 tests)
cd src-tauri && cargo test

# Frontend tests (48 tests across 17 files, via Vitest — 3 files currently failing)
npx vitest run

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

GitHub Actions (`claude.yml`) runs Claude Code on issues/PRs when tagged with `@claude`.
