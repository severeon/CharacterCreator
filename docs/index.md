# Arcanum Engine

A universal tabletop RPG engine — content-driven, event-sourced, and game-system-agnostic. The app is an empty shell: a frontmatter and MDX parser, a data-driven rules engine, an event system, an API, and persistence. D&D 3.5e, Pathfinder 2e, Dread — all are content packs. The engine provides the primitives; the packs provide the game.

**Current status:** Designing v2 architecture. See `docs/superpowers/specs/2026-04-01-arcanum-v2-design.md` for the full system design.

## Project Vision

Arcanum does not know what STR or DEX means. It does not know what a feat is. It knows: here is an entity, here is a subscription watching for events, here is a computed view over entity state, here is a UI primitive. All game-specific knowledge lives in content packs.

**Dogfooding as design:** AI agents building the engine are the first users of the engine. Friction encountered during dogfooding is a design flaw exposed and fixed.

## Sections

| Section | Description |
|---------|-------------|
| **[Entity System](entity-system/)** | Type hierarchy, inheritance, composition, tags, plugin escape hatch |
| **[Content Pack Format](content-pack-format/)** | Source packs, supplement packs, campaign packs, versioning, JSON Schema validation |
| **[Predicate & Subscription Language](predicate-subscription-language/)** | Combinator predicates, operation algebra, Zen-expression formulas, Rule of Cool |
| **[Mechanics Encoding](mechanics-encoding/)** | Ability scores, skills, saves, progressions — defined in content, not engine |
| **[Workflows](workflows/)** | Data-driven character creation, level-up, combat — workflows as entities |
| **[DM Authority & Campaign Model](dm-authority/)** | Permission model, campaign pack lifecycle, event log, Rule of Cool |
| **[UI Primitive Mapping](ui-primitive-mapping/)** | Engine-provided primitives and view mode templates; content packs define view modes, layouts, and styling/theming |
| **[Engine Architecture](engine-architecture/)** | What the engine owns (parser, indexer, event system, API, persistence) |
| **[Migration Path](migration-path/)** | Phased migration from current state to v2, with dogfooding at each phase |
| **[Agent System](agent-system/)** | Personas, skills, force multiplication discipline, worktree strategy |

## Architecture Summary

```
Content Packs (MDX + YAML)
    ├── entities/          (mechanics, templates, rules, actionables)
    ├── view_modes/        (configured templates: card, reference, battlemap, etc.)
    ├── layouts/           (section layouts: character sheet, entity detail)
    └── styling/           (theme: colors, fonts, assets)
    ↓ parse + validate + schema
Engine (Rust)
    ├── Pack Loader
    ├── Entity Store
    ├── Event Log
    ├── Subscription Runner (predicate combinators)
    ├── Computed View Engine
    ├── Zen-expression WASM
    └── Plugin Host (async escape hatch)
    ↓ IPC
Frontend (React/TS + Tauri)
    └── Resolves view_mode + layout + theme per entity; renders primitives

Campaign Pack (mutable) ← DM overrides, homebrew, Rule of Cool, custom view modes, custom styling
    ↓ publish
Supplement Pack (immutable, shareable)
```

## Key Technology Choices

| Concern | Decision |
|---------|----------|
| Expression language | Zen-expression (WASM) — same evaluator in Rust and JS |
| Schema validation | JSON Schema (YAML) + jsonschema crate |
| Cross-entity rules | Rego (Phase 2) via regorus crate |
| Worktree isolation | pnpm + sccache |
| Visual testing | Playwright E2E |
| Build | Per-platform runners (aibox for Linux, GitHub hosted for Win/Mac) |
| Plugin escape hatch | Async `context → operations[]` contract (WASM/Lua compatible) |

## Current Phase

Designing Phase 0: Infrastructure setup + dogfooding environment configuration.

See `docs/migration-path/` for the full phased migration plan.
