# D&D 3.5e Character Creator

A Tauri v2 desktop application for browsing D&D 3.5e content and creating characters. Built with a Rust event-sourced backend and React/TypeScript frontend.

The app loads SRD 3.5e content packs (~960 MDX entity files covering classes, races, feats, and spells), presents them in a searchable/filterable browser, and provides a multi-step character creation wizard with DM authority controls.

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
| `src-tauri/` | Rust backend -- entity store, pack loader, event-sourced engine, Tauri IPC |
| `src/` | React + TypeScript frontend -- Vite, TailwindCSS, routes, components |
| `src/components/wizard/` | Character creation wizard step components (30+) |
| `src/components/primitives/` | Reusable UI primitive components (19) |
| `src/workflows/` | Workflow definitions -- `character-creation.ts` |
| `content/packs/srd-3.5e/` | SRD 3.5e content pack -- manifest.yaml + MDX entities |
| `scripts/codegen/` | Node scripts that generate MDX entities from legacy JS data |
| `docs/superpowers/` | Implementation plans (active + archived) |
| `app.html` | Legacy single-page character creator (codegen data source) |

## Content Packs

Content packs live in `content/packs/`. Each pack contains:
- `manifest.yaml` -- pack metadata and entity type declarations
- `entities/` -- MDX files organized by type (classes/, races/, feats/, spells/, mechanics/)

The SRD 3.5e pack includes ~960 entity files generated from the legacy data files (`classes.js`, `feats.js`, `spells.js`).

To regenerate content from legacy data:

```sh
node scripts/codegen/run.mjs
```

## Character Creation

The wizard walks through 12 steps: generate abilities, choose race, choose class, assign abilities, starting package, racial/class features, allocate skills, choose feats, description, equipment, combat numbers, and details.

DM settings control ability generation method, gestalt mode, ECL limits, template restrictions, and prerequisite enforcement.

## Testing

```sh
# Rust tests (101 tests)
cd src-tauri && cargo test

# Frontend tests (107 tests across 28 files, via Vitest)
npx vitest run

# Single test file
npx vitest run src/components/wizard/WorkflowStepper.test.tsx

# Codegen tests (Node native test runner)
node --test scripts/codegen/tests/arcanum.test.mjs

# E2E tests (Playwright)
npx playwright test
```

## CI

GitHub Actions:
- `ci.yml` -- frontend Vitest, Rust `cargo test`, Linux Tauri build, Playwright E2E on push/PR to main
- `claude.yml` -- Claude Code on issues/PRs tagged with `@claude`
- `opencode.yml` -- OpenCode on `/oc` or `/opencode` comments

## Legacy Character Creator

`app.html` is the original single-page D&D 3.5e gestalt character creator. It runs standalone in any browser and serves as the data source for codegen. See the legacy data files (`classes.js`, `feats.js`, `spells.js`) for the raw data format.
