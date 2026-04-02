# Milestone 1: Content Browser in a Tauri Window

## Design Document

**Date:** 2026-03-26
**Status:** Pre-implementation
**Parent spec:** `2026-03-26-arcanum-engine-design.md`
**Target platforms:** macOS, Windows (Android deferred to post-Milestone 2)

---

## 1. Goal

Ship a functional desktop app that loads D&D 3.5e content packs from disk and presents them in a browsable, searchable UI. Data flows through the Arcanum architecture: Rust backend owns all data, React frontend is a pure view layer communicating via Tauri IPC.

No character creation, no event queue, no subscriptions — just the content pack loader, entity store, and a read-only UI.

---

## 2. Architecture

```
┌──────────────────────────────────────────────┐
│              Vite + React + TS               │
│   Entity Browser  ·  Detail View  ·  Search  │
│                                              │
│   MDX body rendered via @mdx-js/mdx          │
│   Sends: IPC queries                         │
│   Receives: Entity data + MDX body strings   │
└─────────────────────┬────────────────────────┘
                      │ Tauri v2 IPC (invoke)
┌─────────────────────┴────────────────────────┐
│              Rust Backend (src-tauri/)        │
│                                              │
│  ┌─────────────┐  ┌───────────────────────┐  │
│  │ Pack Loader │  │    Entity Store       │  │
│  │ (YAML/MDX)  │→ │ HashMap<String,Entity>│  │
│  └─────────────┘  └───────────────────────┘  │
│                                              │
│  IPC Commands:                               │
│  · get_entities_by_type(type) → Entity[]     │
│  · get_entity_by_id(id) → Entity + mdx_body  │
│  · search_entities(query) → Entity[]         │
└──────────────────────────────────────────────┘

Content on disk:
  content/packs/srd-3.5e/
    manifest.yaml
    entities/races/*.mdx
    entities/classes/*.mdx
    entities/feats/*.mdx
    entities/spells/*.mdx
```

- Rust owns all data. React never reads files directly.
- Entity properties are `HashMap<String, Value>` — schemaless, per the Arcanum design.
- MDX body stored as a raw string, passed to frontend on demand for client-side rendering.

---

## 3. Rust Crate Structure

For Milestone 1 we need two things from Rust: load content packs and serve entities via IPC.

```
src-tauri/
  Cargo.toml
  src/
    main.rs              # Tauri app entry, registers IPC commands
    entity.rs            # Entity, Value structs
    pack_loader.rs       # Reads manifest.yaml, walks entity dirs, parses MDX frontmatter
    store.rs             # In-memory EntityStore, query methods
    ipc.rs               # Tauri #[command] handlers
```

**Dependencies:** `serde`, `serde_yaml`, `serde_json`, `tauri`, `uuid`

No full MDX parser — split on `---` delimiters and parse the frontmatter block as YAML.

### 3.1 Entity Struct (Milestone 1)

```rust
struct Entity {
    id: String,                          // "srd:race:human"
    entity_type: String,                 // "race", "class", "feat", "spell"
    properties: HashMap<String, Value>,  // schemaless bag
    tags: Vec<String>,                   // for filtering/search
    mdx_body: String,                    // raw MDX content, passed to frontend
    source_pack: String,                 // "srd-3.5e"
}

/// Lightweight projection for list views — omits properties and mdx_body.
struct EntitySummary {
    id: String,
    entity_type: String,
    name: String,                        // extracted from properties["name"]
    tags: Vec<String>,
}
```

Fields omitted for Milestone 1 (added when engine needs them): `subscriptions`, `computed_views`, `prototype`.

**Type simplifications vs. parent spec:** The Arcanum design uses `id: Uuid` and `source_pack: PackRef`. Milestone 1 uses `String` for both. When Milestone 2 introduces entity cross-references and multi-pack campaigns, these will be upgraded to their full types. The `String` id format (`srd:class:fighter`) is designed to be deterministically convertible to a UUID v5 (namespace + id string) when the migration happens.

### 3.2 Value Enum

```rust
enum Value {
    Int(i64),
    Float(f64),
    Bool(bool),
    Str(String),
    List(Vec<Value>),
    Map(HashMap<String, Value>),
    Null,
}
```

`EntityRef(Uuid)` deferred — not needed until entities reference each other at runtime.

### 3.3 IPC Commands

| Command | Args | Returns |
|---------|------|---------|
| `get_entities_by_type` | `entity_type: String` | `Vec<EntitySummary>` (id, name, tags — no mdx_body) |
| `get_entity_by_id` | `id: String` | `Entity` (full properties + mdx_body) |
| `search_entities` | `query: String` | `Vec<EntitySummary>` (name/tag substring match) |

`EntitySummary` is a lightweight projection for list views — avoids sending 960 MDX bodies over IPC (see struct definition in §3.1).

Search behavior: case-insensitive substring match against entity `name` and `tags`. Results sorted alphabetically by name. Searches across all entity types (no type filter — the frontend can filter client-side).

---

## 4. Frontend Structure

Vite + React + TypeScript. The existing `webapp/` directory (Next.js) is deleted entirely and replaced with a fresh Vite + React + TS project initialized via `npm create vite@latest`. The Tauri CLI (`cargo tauri init`) scaffolds `src-tauri/` alongside the frontend. Final project structure:

```
CharacterCreator/
  src-tauri/           # Rust backend (Tauri)
  src/                 # React frontend (Vite)
  content/             # Content packs
  scripts/             # Codegen
  ...legacy files...
```

Frontend source tree:

```
src/
  main.tsx               # React root, mounts App
  App.tsx                # Layout shell + router
  routes/
    EntityList.tsx       # Filterable list/grid of entities by type
    EntityDetail.tsx     # Single entity view (properties + rendered MDX)
  components/
    Sidebar.tsx          # Navigation: Races, Classes, Feats, Spells
    SearchBar.tsx        # Full-text search across entity names/tags
    PropertyTable.tsx    # Renders a properties bag as a readable table
    MdxRenderer.tsx      # Takes raw MDX string, compiles + renders client-side
  lib/
    engine.ts            # Tauri IPC wrapper — typed functions for each query
    types.ts             # Entity, Value, PropertyMap TS types (mirrors Rust)
  styles/
    globals.css          # Tailwind base
```

### 4.1 Routing

`react-router` with routes:

- `/` — redirect to `/races`
- `/:entityType` — `EntityList` (races, classes, feats, spells)
- `/:entityType/:id` — `EntityDetail`

### 4.2 MDX Rendering

`@mdx-js/mdx` `evaluate()` compiles MDX strings to React components at runtime. The raw MDX body comes from Rust via IPC; React renders it client-side with full component support.

**Setup requirement:** `evaluate()` from `@mdx-js/mdx` v3 requires passing `Fragment`, `jsx`, `jsxs` from a JSX runtime (e.g., `react/jsx-runtime`). The `MdxRenderer` component handles this wiring.

**Bundle size note:** Runtime MDX compilation bundles a full JS parser (~200-400KB). Acceptable for a Tauri desktop app; revisit if bundle size becomes a concern.

**Dependency:** `@mdx-js/mdx` (the core compile/evaluate package) must be added — the existing `@mdx-js/loader` and `@mdx-js/react` are Next.js-specific and will be replaced.

### 4.3 Styling

Tailwind CSS 4 (carried over from existing setup).

---

## 5. Content Pack Format

### 5.1 Directory Layout

The current content lives at `content/races/`, `content/classes/`, etc. with hierarchical subdirectories (e.g., `content/classes/barbarian/barbarian.mdx`, `content/races/dwarves/dwarf-mountain.mdx`). The codegen restructures this into the Arcanum pack layout while preserving the subdirectory hierarchy:

```
content/packs/srd-3.5e/
  manifest.yaml
  entities/
    races/
      dwarves/dwarf-mountain.mdx
      elves/elf-high.mdx
      ...
    classes/
      barbarian/barbarian.mdx
      fighter/fighter.mdx
      prestige/arcane-archer.mdx
      ...
    feats/*.mdx
    spells/
      abjuration/alarm.mdx
      evocation/fireball.mdx
      ...
```

The Rust pack loader walks entity directories **recursively** — subdirectory structure is organizational only and does not affect entity semantics.

### 5.2 Manifest

```yaml
id: "srd-3.5e"
name: "D&D 3.5e System Reference Document"
version: "1.0.0"
pack_type: source
dependencies: []
```

### 5.3 Entity MDX Format

**Current format:** The existing 960 `.mdx` files use a flat frontmatter structure with fields like `type: class`, `name: Fighter`, `hd: 10` at the top level. The codegen update (§5.4) restructures these into the Arcanum format shown below.

All game-specific fields live inside `properties`. Top-level keys are engine-level only.

```yaml
---
id: "srd:class:fighter"
entity_type: "class"
properties:
  name: "Fighter"
  source: "PHB"
  hd: 10
  bab: "full"
  saves:
    fort: "good"
    ref: "poor"
    will: "poor"
  skillPoints: 2
  classSkills: [Climb, Craft, ...]
  specialAbilities: [...]
  bonusFeats: [1, 2, 4, ...]
tags:
  - "source:phb"
  - "role:tank"
---

## Fighter
(MDX body — rendered in app)
```

The `id` format: `srd:<entity_type>:<slug>` where slug is derived from name (e.g., "Power Attack" → `power-attack`).

### 5.4 Codegen

Existing `scripts/codegen/` pipeline is updated to output the Arcanum format. Source data remains `classes.js`, `feats.js`, `spells.js`. The generators (`gen-races.mjs`, `gen-classes.mjs`, `gen-feats.mjs`) are modified, and `gen-spells.mjs` is created (currently missing — spells were generated by a separate one-off script). Changes:

- Wrap all game fields inside `properties:`
- Add `id:` (generated from type + slug)
- Add `entity_type:` (from existing `type` field)
- Move `tags:` to top level
- Output into `content/packs/srd-3.5e/entities/` instead of `content/`

The MDX body generation stays the same.

---

## 6. Cleanup (Pre-Implementation)

Remove dead code from main before starting:

| Remove | Reason |
|--------|--------|
| `webapp/src/context/` (3 files) | Sprint 1 reducers — replaced by Rust engine |
| `webapp/src/__tests__/reducers/` (2 files) | Tests for dead reducers |
| `webapp/src/lib/content-pack-loader.js` | JS loader replaced by Rust |
| `webapp/src/lib/content-pack-types.js` | JS types replaced by TS |
| `webapp/src/__tests__/content-pack-*.test.js` (2 files) | Tests for dead loader |
| `gray-matter` from `webapp/package.json` | No longer needed |
| `docs/superpowers/specs/2026-03-25-nextjs-migration-design.md` | Superseded |
| `docs/superpowers/plans/2026-03-25-sprint-0-content-pack-foundation.md` | Dead plan |
| `scripts/codegen-content-packs.js` | Old codegen (replaced by `scripts/codegen/`) |

**Keep:** `scripts/codegen/`, legacy `app.html`/`classes.js`/`feats.js`/`spells.js` (codegen source data), `content/` (regenerated).

---

## 7. Testing Strategy

### 7.1 Rust (cargo test)

- Pack loader: parse sample MDX fixture, verify Entity fields
- Entity store: load fixture pack, verify query by type/id/search
- Frontmatter edge cases: missing optional fields, empty properties, malformed YAML

Fixtures live in `src-tauri/tests/fixtures/`.

### 7.2 Frontend (vitest)

- `engine.ts` IPC wrapper: mock Tauri `invoke`, verify command names and argument shapes
- Type mapping: Rust `Value` variants deserialize correctly to TS types

No UI component tests. No E2E tests for Milestone 1 (read-only browser — visual verification sufficient).

---

## 8. What This Milestone Does NOT Include

Explicitly deferred to Milestone 2+:

- Character creation / event queue / subscriptions / computed views
- Workflow engine
- Campaign packs (only source packs in M1)
- Android builds
- Retcon/rewind system
- Pack auditor
- Any game logic — M1 is a pure content browser
