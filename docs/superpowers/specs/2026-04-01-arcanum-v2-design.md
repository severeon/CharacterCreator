# Arcanum Engine v2 — System Design

**Date:** 2026-04-01
**Status:** Draft
**Authors:** Thomas Quick, Claude (Opus 4.6)

---

## Vision

Arcanum is a universal tabletop RPG engine — a content-driven, event-sourced state machine that knows nothing about any specific game system. The app is an empty shell: a frontmatter and MDX parser, a data-driven rules engine, an event system, an API, and persistence. D&D 3.5e, Pathfinder 2e, Dread — all are content packs. The engine provides the primitives; the packs provide the game.

The app does not know what STR or DEX means. It does not know what a feat is. It knows: here is an entity, here is a subscription watching for events, here is a computed view over entity state, here is a UI primitive. Content packs encode all game-specific mechanics using those primitives.

---

## Guiding Principles

1. **Engine is empty, content is full.** The engine ships with no hardcoded game knowledge. Every ability score, every skill, every rule comes from a content pack.
2. **Dogfooding as design.** AI agents building the engine are the first users of the engine. Friction encountered during dogfooding is a design flaw.
3. **Schema validates, expressions compute, subscriptions react.** These three mechanisms (JSON Schema, Zen-expression, event subscriptions) are the full vocabulary of game logic.
4. **DM is the superuser.** The DM's campaign pack is the mutable layer on top of immutable source packs. The DM can override anything, patch forward with Rule of Cool, and publish their campaign as a shareable supplement.
5. **Force multiplication compounds.** Each phase's learnings are captured as agent skills and personas. Future agents inherit knowledge rather than relearning.
6. **Graceful chaos.** The system serves live tabletop sessions with unpredictable human input. Bizarre edge cases are guaranteed, not hypothetical. Errors never crash the session — they're caught, logged with human-readable context, and where possible, made entertaining. The error log is part of the experience, not hidden infrastructure.

---

## 1. Entity System

**Spec:** `docs/entity-system/`

### Type System

The engine defines **eight top-level entity categories**. Engine behavior keys off these categories — creatures have mutable state, templates are applied to creatures, workflows have steppers. Subtypes below the top level (e.g., `template.class` vs `template.race`) are content-pack conventions expressed as dot-notation strings — opaque to the engine. All querying and filtering uses tags, not type hierarchy.

**Engine-owned categories:**

| Category | Engine Semantics |
|----------|-----------------|
| `creature` | Has mutable state, abilities, HP, saves, skills, size, speed |
| `template` | Blueprint applied to creatures (race, class, monster template) |
| `rule` | Modifies state via subscriptions (feat, class feature, condition) |
| `actionable` | Activatable with cost/targeting/duration (spell, power, maneuver) |
| `mechanic` | System primitives (ability score def, skill def, progression) |
| `object` | Physical things (weapon, armor, gear, trap, vehicle) |
| `container` | Owns/holds other entities (inventory, spellbook, feat slot group) |
| `workflow` | Step sequences and processes (character creation, level-up, combat round) |

Content packs use dot-notation subtypes as conventions: `template.class`, `template.race`, `rule.feat`, `actionable.spell`. The engine treats these as opaque strings — it only inspects the portion before the first dot to determine category semantics. Content packs cannot define new top-level categories.

### Entity Structure

```yaml
---
id: "srd:class:fighter"
entity_type: "template.class"
extends: "template"
properties:
  name: "Fighter"
  hd: 10
  bab_progression: "srd:mechanic:bab-full"
  saves:
    fort: good
    ref: poor
    will: poor
  skill_points: 2
  class_skills:
    - climb
    - craft
    - handle_animal
  bonus_feats: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
subscriptions:
  - trigger: "level_up"
    predicate:
      all:
        - entity.class: "fighter"
        - level:
            one_of: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
    effects:
      - op: "add"
        path: "feat_slots.combat"
        value: 1
computed_views:
  - path: "bab"
    inputs: ["bab_progression", "level"]
    formula: "lookup(bab_progression, level)"
tags:
  - "source:phb"
  - "role:martial"
  - "type:fighter"
---
```

### Tags

Flat, queryable labels. Not a type hierarchy. Used for filtering and subscription predicates.

```
school:evocation, school:necromancy, school:divination
alignment:lawful-good, alignment:chaotic-evil
source:phb, source:complete-warrior
rarity:common, rarity:rare
```

### Composition

Entities own other entities via references:

```yaml
# A PlayerCharacter contains an Inventory
properties:
  inventory: "campaign:inventory:pc-123-inventory"

# Inventory contains Items
properties:
  items:
    - "srd:item:longsword"
    - "srd:item:chainmail"
```

### Extends — Deep Merge with Array Operators

`extends` is the single inheritance mechanism. It performs a **recursive deep merge** — child properties override parent properties at every nesting level.

- Single inheritance only — one `extends` target per entity
- Works across pack boundaries (campaign entity can extend source entity)
- Resolution walks: `entity → extends target → target's extends target → ...`

**Array merge behavior:**

By default, child arrays **replace** parent arrays entirely. Content authors can use merge directives to modify parent arrays instead:

```yaml
# Parent (srd:class:fighter)
properties:
  class_skills: [climb, craft, handle_animal, intimidate, jump, ride, swim]

# Child (dark-sun:class:gladiator) extends srd:class:fighter
properties:
  class_skills:
    $append: [perform, tumble]        # Result: [...parent skills, perform, tumble]
    $remove: [ride]                    # Then remove ride
```

Available array directives:
- `$append: [items]` — add items after parent array
- `$prepend: [items]` — add items before parent array
- `$remove: [items]` — remove matching items from parent array

Scalar and object properties use simple override — child value wins at that key. For nested objects, the merge recurses.

### Plugin Escape Hatch

Content packs that need mechanics beyond YAML subscriptions use the plugin contract:

```
Input:  { event, entity_state, context, config }  →  Plugin  →  Output: { operations[] }
```

- Plugins return zero or more Arcanum operations (`Set`, `Grant`, `Add`, `Revoke`, etc.)
- Plugins are async — can call external services, run WASM, do heavy computation
- Engine validates all returned operations before applying
- Plugin modules ship as WASM or Lua scripts conforming to the contract

```yaml
subscriptions:
  - trigger: "tower_pull"
    plugin: "dread:jenga-tower"
    config:
      difficulty: "formula: tension_level * 2"
    # no effects block — plugin returns operations
```

---

## 2. Content Pack Format

**Spec:** `docs/content-pack-format/`

### Pack Types

#### Source Pack (immutable, published)
```yaml
# content/packs/srd-3.5e/manifest.yaml
id: "srd-3.5e"
name: "D&D 3.5e System Reference Document"
version: "1.0.0"
pack_type: source
system: "dnd-3.5e"
defines_system: true          # this pack IS the system definition
dependencies: []
```

#### Supplement Pack (immutable, extends a source)
```yaml
# content/packs/complete-warrior/manifest.yaml
id: "complete-warrior"
version: "1.0.0"
pack_type: source
system: "dnd-3.5e"
defines_system: false
dependencies:
  - id: "srd-3.5e"
    version: ">=1.0.0"
```

#### Campaign Pack (mutable, auto-created per game session)
```yaml
# campaigns/dark-sun-monday/manifest.yaml
id: "dark-sun-monday"
name: "Monday Night Dark Sun"
version: "0.1.0-draft"
pack_type: campaign
system: "dnd-3.5e"
sources:
  - id: "srd-3.5e"
    version: "1.0.0"          # pinned — won't auto-update
  - id: "complete-warrior"
    version: "1.0.0"
```

### Directory Structure

```
content/packs/srd-3.5e/
├── manifest.yaml
├── schemas/
│   ├── _base.schema.yaml           # shared $defs (save_progression, bab_type)
│   ├── mechanic.schema.yaml
│   ├── template.schema.yaml
│   ├── rule.schema.yaml
│   ├── actionable.schema.yaml
│   ├── object.schema.yaml
│   ├── container.schema.yaml
│   └── workflow.schema.yaml
└── entities/
    ├── mechanics/
    │   ├── ability-scores.mdx
    │   ├── skills.mdx
    │   ├── saving-throws.mdx
    │   ├── bab-progressions.mdx
    │   └── size-categories.mdx
    ├── templates/
    │   ├── races/
    │   │   ├── dwarf-hill.mdx
    │   │   └── elf-moon.mdx
    │   ├── classes/
    │   │   ├── fighter.mdx
    │   │   └── wizard.mdx
    │   └── prestige-classes/
    ├── rules/
    │   ├── feats/
    │   ├── class-features/
    │   └── racial-traits/
    ├── actionables/
    │   ├── spells/
    │   └── powers/
    ├── objects/
    │   ├── weapons/
    │   └── armor/
    └── workflows/
        ├── character-creation.mdx
        └── level-up.mdx
```

### Entity Resolution

When a campaign loads, entities are resolved by walking:
`campaign overrides → campaign homebrew → supplement packs → source packs`

Campaign overrides use copy-on-write — the engine copies the source entity into the campaign layer, the campaign version is what gets modified. Source packs never change.

### Pack Lifecycle

```
Source Pack (immutable)
    ↓ DM selects sources, creates campaign
Campaign Pack (mutable, active game)
    ↓ DM publishes (freeze event log, assign version)
Published Campaign (immutable, shareable as supplement)
    ↓ another DM imports
New Campaign (mutable, builds on published campaign)
```

Publishing strips the event log (game state is private) and converts `pack_type: campaign` → `pack_type: source`. Dependencies include the original sources at pinned versions.

### JSON Schema Validation

Each content pack includes `schemas/` directory. At pack load time, the Rust engine validates every entity against its schema using the `jsonschema` crate (serde_json::Value validated against YAML schemas converted to JSON Schema). Invalid entities cause a load error with a clear message.

Schema files are written in YAML and converted to JSON Schema at validation time. VS Code plugins provide autocomplete from JSON Schema annotations.

---

## 3. Predicate & Subscription Language

**Spec:** `docs/predicate-subscription-language/`

### Predicate Combinators

Structured YAML — no string-based boolean expressions.

```yaml
all:    # every predicate must pass
any:    # at least one must pass
not:    # negation
one_of: # value is in list
none_of:# value is not in list
gte:    # greater than or equal
lte:    # less than or equal
gt:     # greater than
lt:     # less than
eq:     # equality
has_tag:        # entity has tag
has_property:   # property path exists
matches:        # pattern match on tag or string
```

Examples:

```yaml
# Simple: Fighter at a bonus feat level
predicate:
  all:
    - entity.class: "fighter"
    - level:
        one_of: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]

# Complex: Wizard with specialist school
predicate:
  all:
    - entity.class: "wizard"
    - not:
        spell.school:
          one_of: ["$entity.prohibited_schools"]

# With computed input
predicate:
  has_tag: "spell:area-effect"
  entity.level:  # references computed view value
    gte: 3
```

### Effects — Operation Algebra

```yaml
Set:      # Replace value at path
Add:      # Add to numeric path
Sub:      # Subtract from numeric path
Multiply: # Multiply numeric path
Grant:    # Add to inventory / install subscription
Revoke:   # Remove from inventory / uninstall subscription
Push:     # Push onto stack
Pop:      # Pop from stack
Clear:    # Remove value at path
```

Each effect includes `path` (dot-notation), `value`, `source` (for audit), and optionally `stack_rule` for collision handling.

### Zen-Expression for Formulas

Where a value could be static, `formula:` substitutes a Zen-expression expression:

```yaml
computed_views:
  - path: "abilities.strength.modifier"
    inputs: ["abilities.strength.score"]
    formula: "(abilities.strength.score - 10) / 2"
    source: "srd:mechanic:ability-scores"

  - path: "skills.climb.max_ranks"
    inputs: ["level", "is_class_skill"]
    formula: "if is_class_skill then level + 3 else (level + 3) / 2"
    source: "srd:mechanic:skills"
```

Zen-expression is used via WASM — same evaluator runs in Rust (engine) and JavaScript (frontend validation/preview). This ensures expressions evaluate identically on both sides.

**Built-in functions (engine-provided, game-agnostic):**

`lookup`, `if/then/else`, `min`, `max`, `floor`, `ceil`, `filter`, `map`, `sum`, `count`

The engine ships **no game-specific functions**. Composed game logic (e.g., computing iterative attacks from BAB) is expressed as **computed views in content packs** that other computed views can reference by path. A computed view *is* a named function — no separate function registration system exists.

```yaml
# Content pack defines a composed computation as a computed view
computed_views:
  - path: "combat.iterative_attacks"
    inputs: ["bab"]
    formula: "if bab >= 16 then [bab, bab-5, bab-10, bab-15] else if bab >= 11 then [bab, bab-5, bab-10] else if bab >= 6 then [bab, bab-5] else [bab]"
    source: "srd:mechanic:bab-progressions"

  # Another view references it
  - path: "combat.attack_summary"
    inputs: ["combat.iterative_attacks", "equipment.weapon.enhancement"]
    formula: "map(combat.iterative_attacks, x -> x + equipment.weapon.enhancement)"
    source: "srd:mechanic:combat"
```

This system only opens to content-registered functions if we hit a concrete limitation that computed view composition cannot solve.

### Rule of Cool — Forward Patch

```yaml
# When DM hits "Rule of Cool" button
- op: "set"
  path: "inventory.gold"
  value: 8315
  source: "dm:rule-of-cool"
  note: "The merchant recognized the party's sigil — old debt forgiven"
  previous_ops_referenced: ["purchase.longsword"]
  timestamp: "2026-04-01T20:15:00Z"
```

- Append-only: inserts a compensating event rather than rewriting history
- `note` is an AI-facing hint (ignored by engine, passed to storytelling layer)
- `previous_ops_referenced` traces causality for AI narrative generation

---

## 4. Mechanics Encoding

**Spec:** `docs/mechanics-encoding/`

All game primitives — ability scores, skills, saves, progressions, size — are defined as Mechanic entities in content packs. The engine reads them at load time to populate UI primitives and compute derived values. A different game system (5e, PF2e) ships different Mechanic entities.

### Ability Scores

```yaml
# content/packs/srd-3.5e/entities/mechanics/ability-scores.mdx
---
id: "srd:mechanic:ability-scores"
entity_type: "mechanic"
properties:
  name: "Ability Scores"
  modifier_formula: "(score - 10) / 2"
  generation_methods:
    - id: "4d6-drop-lowest"
      name: "Standard Rolling"
      dice: "4d6kh3"
    - id: "point-buy"
      name: "Point Buy"
      budget: 27
      cost_table:
        8: 0
            9: 1
            10: 2
            11: 3
            12: 4
            13: 5
            14: 7
            15: 9
    - id: "standard-array"
      name: "Standard Array"
      values: [15, 14, 13, 12, 10, 8]
  abilities:
    - id: "str"; name: "Strength"; abbreviation: "STR"
    - id: "dex"; name: "Dexterity"; abbreviation: "DEX"
    - id: "con"; name: "Constitution"; abbreviation: "CON"
    - id: "int"; name: "Intelligence"; abbreviation: "INT"
    - id: "wis"; name: "Wisdom"; abbreviation: "WIS"
    - id: "cha"; name: "Charisma"; abbreviation: "CHA"
---
```

### Skills

```yaml
# content/packs/srd-3.5e/entities/mechanics/skills.mdx
---
id: "srd:mechanic:skills"
entity_type: "mechanic"
properties:
  name: "Skill System"
  max_ranks_formula: "if is_class_skill then level + 3 else (level + 3) / 2"
  cost:
    class_skill: 1
    cross_class: 2
  first_level_multiplier: 4
  skills:
    - id: "climb"; name: "Climb"; ability: "str"; trained_only: false; armor_check_penalty: true
    - id: "hide"; name: "Hide"; ability: "dex"; trained_only: false; armor_check_penalty: true
    # ... all 43 D&D 3.5e skills
---
```

### Saving Throws

```yaml
---
id: "srd:mechanic:saving-throws"
entity_type: "mechanic"
properties:
  name: "Saving Throws"
  saves:
    - id: "fort"; name: "Fortitude"; abbreviation: "Fort"; ability: "con"
    - id: "ref"; name: "Reflex"; abbreviation: "Ref"; ability: "dex"
    - id: "will"; name: "Will"; abbreviation: "Will"; ability: "wis"
  progressions:
    good: [2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12]
    poor: [0,0,1,1,1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6]
---
```

### BAB Progressions

```yaml
---
id: "srd:mechanic:bab-progressions"
entity_type: "mechanic"
properties:
  progressions:
    full:   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
    medium: [0,1,2,3,3,4,5,6,6,7,8,9,9,10,11,12,12,13,14,15]
    poor:   [0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10]
  iterative_attack_threshold: 6
  iterative_attack_formula: "if bab >= 6 then [bab, bab-5, bab-10, bab-15] else [bab]"
---
```

### Size Categories

```yaml
---
id: "srd:mechanic:size-categories"
entity_type: "mechanic"
properties:
  categories:
    - id: "fine"; name: "Fine"; ac_mod: 8; attack_mod: 8; grapple_mod: -16
    - id: "diminutive"; name: "Diminutive"; ac_mod: 4; attack_mod: 4; grapple_mod: -12
    # ... through
    - id: "colossal"; name: "Colossal"; ac_mod: -8; attack_mod: -8; grapple_mod: 16
---
```

---

## 5. Workflows

**Spec:** `docs/workflows/`

Workflows are entities — defined in content packs, not hardcoded. The engine provides a generic workflow stepper; content defines the steps.

### Character Creation Workflow

```yaml
---
id: "srd:workflow:character-creation"
entity_type: "workflow"
properties:
  name: "Character Creation"
  completion_creates: "creature.player_character"
  steps:
    - id: "ability-generation"
      name: "Generate Ability Scores"
      component: "ability-allocator"
      config:
        methods_ref: "srd:mechanic:ability-scores#generation_methods"
      required: true

    - id: "select-race"
      name: "Choose Race"
      component: "entity-selector"
      config:
        entity_type: "template.race"
        display: "card-grid"
      required: true
      depends_on: ["ability-generation"]

    - id: "select-class"
      name: "Choose Class"
      component: "entity-selector"
      config:
        entity_type: "template.class"
        display: "card-grid"
      required: true
      depends_on: ["select-race"]

    - id: "assign-abilities"
      name: "Assign Ability Scores"
      component: "ability-allocator"
      config:
        abilities_ref: "srd:mechanic:ability-scores#abilities"
        show_racial_bonuses: true
      required: true
      depends_on: ["ability-generation", "select-race"]

    - id: "allocate-skills"
      name: "Allocate Skills"
      component: "skill-allocator"
      config:
        skills_ref: "srd:mechanic:skills"
      required: true
      depends_on: ["select-class", "assign-abilities"]

    - id: "select-feats"
      name: "Choose Feats"
      component: "entity-selector"
      config:
        entity_type: "rule.feat"
        filter_eligible: true
        display: "filterable-list"
      required: true
      repeatable: true
      depends_on: ["select-class"]

    - id: "equipment"
      name: "Starting Equipment"
      component: "equipment-allocator"
      config:
        starting_gold_ref: "srd:mechanic:starting-gold"
      required: false
      depends_on: ["select-class"]

    - id: "description"
      name: "Character Description"
      component: "text-form"
      config:
        fields: ["name", "alignment", "appearance", "background"]
      required: false
---
```

### Workflow Override — DM Customization

Campaign packs can extend and override workflows:

```yaml
---
id: "dark-sun:workflow:character-creation"
entity_type: "workflow"
extends: "srd:workflow:character-creation"
properties:
  name: "Dark Sun Character Creation"
  steps:
    # Insert narrative intro before race selection
    - id: "dark-sun-presents"
      name: "Dark Sun Presents..."
      component: "narrative-block"
      config:
        text: "In the Tablelands, only the strong survive..."
      before: "select-race"

    # Override race step to exclude PHB races
    - id: "select-race"
      override: "srd:workflow:character-creation.select-race"
      config:
        filter:
          tags:
            exclude: ["source:phb"]
        replacements:
          "srd:race:elf": "dark-sun:race:half-giant"
---
```

### Component Contract

Each step's `component` names an engine UI primitive. Components receive:
- `config` — content-defined configuration (references to Mechanic entities, display options)
- `entity_state` — current character state from the engine
- `event_log` — for speculative state preview

---

## 6. DM Authority & Campaign Model

**Spec:** `docs/dm-authority/`

### Permission Model

Engine-owned, not content-defined:

| Role | Permissions |
|------|-------------|
| `observer` | Read-only access to game state |
| `player` | Act on their own character within rules |
| `dm` | All player permissions + campaign overrides, Rule of Cool, event log access |

### Campaign Pack Structure

```
campaign pack (mutable)
├── manifest.yaml
├── overrides/
│   └── entities/           # Copy-on-write replacements for source entities
├── homebrew/
│   └── entities/           # DM's custom entities
├── rules/
│   ├── subscriptions/      # House rules as subscription YAML
│   └── workflows/          # Customized workflows
├── event_log/
│   └── events.jsonl        # Append-only event history
└── state/
    └── snapshot.json       # Fast-load current state
```

### Event Log

Append-only log of all state-changing operations. Each event:

```json
{
  "id": "evt-001",
  "timestamp": "2026-04-01T20:00:00Z",
  "op": "add",
  "path": "inventory.items",
  "value": "srd:item:longsword",
  "source": "player:tom",
  "trigger": "purchase.longsword"
}
```

### Rule of Cool

Forward-patch, not retcon. When DM triggers Rule of Cool:

1. Engine identifies the constraint violation
2. DM reviews the proposed patch
3. Engine inserts a new compensating event (not a history rewrite)
4. Event log shows: original action → downstream effects → DM patch

The patch event carries a `note` field — an AI-facing hint for narrative flavor. The engine passes this to whatever AI storytelling layer is integrated.

---

## 7. UI Primitive Mapping

**Spec:** `docs/ui-primitive-mapping/`

The engine provides UI primitives and view mode templates. Content packs define view modes by composing these templates, declare layout entities, and supply styling/theming. The same entity renders differently depending on which view mode is active.

### Rendering Pipeline

```
Content Pack Load
    ↓
Engine reads:
    - view_modes/     (view mode definitions)
    - layouts/        (layout entities)
    - styling/        (theme + asset references)
    ↓
Frontend requests entity with view_mode: "card" or "reference" or "battlemap"
    ↓
Engine resolves view mode from active campaign pack
    ↓
Engine resolves layout from view mode or entity override
    ↓
Engine resolves theme from active campaign pack
    ↓
Frontend renders entity using resolved primitives + layout + theme
```

The engine owns the rendering primitives and the composition logic. Content packs own what renders and how it looks.

---

### Built-in Primitives

Primitives are the atomic units of rendering. They are engine-provided and game-agnostic.

| Primitive | Purpose |
|-----------|---------|
| `computed-field` | Labeled value computed from entity state |
| `progress-bar` | Named track with filled/empty segments (HP, rage rounds) |
| `table` | Rows of computed values (attack bonuses, spell slots) |
| `block` | Titled section containing other primitives |
| `list` | Scrollable list of items (inventory, spells known) |
| `action-bar` | Quick action buttons |
| `text-field` | Freeform input bound to a property path |
| `narrative-block` | Static or conditional narrative text |
| `entity-selector` | Grid/list picker for choosing entities |
| `image` | Art, portrait, or icon with optional caption |
| `divider` | Horizontal rule or spacer |

---

### View Mode Templates

View mode templates are engine-provided patterns. Content packs instantiate and configure them. A handful of templates cover 80%+ of use cases.

| Template | When to Use |
|----------|-------------|
| `card` | Thumbnail, name, short blurb — inventory, selection lists, browse views |
| `reference` | Full art, full description, themed layout — book-style content browsing |
| `table-row` | Compact single-line — spell lists, skill lists, feat lists |
| `battlemap` | Token + combat stats — initiative tracking, combat-relevant display |
| `dm-screen` | DM-facing quick reference — saves, DC, conditions, relevant tags |
| `detail` | All properties exposed — full technical view for power users |
| `narrative` | Rich text with embedded entity references — backstory, descriptions |
| `selector` | Card grid with filtering — choosing race, class, feat during creation |

---

### View Mode Definitions — Generic Slot Mapping

A view mode is a configured instance of a template, defined in a content pack. View modes contain **no domain-specific field names** — instead, they map entity property paths into generic **named slots** that the template defines. Templates own the visual layout; view modes own what data goes where.

Each template exposes a fixed set of named slots. The engine can apply responsive behavior per slot (e.g., `badge` stays visible on mobile, `detail_3` collapses first). Deep merge means campaign overrides can replace individual slot mappings while inheriting the rest.

```yaml
# content/packs/srd-3.5e/view_modes/spell-card.mdx
---
id: "srd:view:spell-card"
entity_type: "view-mode"
extends: "template:card"
properties:
  name: "Spell Card"
  description: "Compact spell display for lists and selection"
  template: card

  slots:
    thumbnail: { path: "art" }
    title: { path: "name" }
    subtitle: { path: "school", label: "School" }
    badge: { path: "spell_level", label: "Level" }
    tag_row: { paths: ["components"], format: "pills" }
    short_desc: { path: "mdx_summary", max_length: 80 }

  filter_tags:
    - { path: "school", label: "School" }
    - { path: "spell_level", label: "Level" }
---

# content/packs/srd-3.5e/view_modes/spell-reference.mdx
---
id: "srd:view:spell-reference"
entity_type: "view-mode"
extends: "template:reference"
properties:
  name: "Spell Reference Page"
  description: "Full spell page with art and complete description"
  template: reference

  slots:
    hero_art: { path: "art", size: "full-width" }
    title: { path: "name" }
    body: { path: "mdx_body", format: "mdx" }
    detail_1: { path: "school", label: "School" }
    detail_2: { path: "spell_level", label: "Level" }
    detail_3: { path: "components", label: "Components", format: "pills" }
    detail_4: { path: "casting_time", label: "Casting Time" }
    detail_5: { path: "range", label: "Range" }
    detail_6: { path: "duration", label: "Duration" }
    detail_7: { path: "saving_throw", label: "Save" }
    detail_8: { path: "spell_resistance", label: "SR" }
---
```

---

### View Mode Override — Campaign Customization

Campaign packs can override view modes. Deep merge means only the changed slots need to be declared — everything else is inherited:

```yaml
# campaigns/dark-sun-monday/view_modes/spell-card.mdx
---
id: "dark-sun:view:desert-spell-card"
entity_type: "view-mode"
extends: "srd:view:spell-card"
properties:
  name: "Dark Sun Spell Card"
  description: "Heat-warped parchment spell card"

  slots:
    # Replace art with campaign variant
    thumbnail: { path: "art_dark_sun" }
    # Remove school and tag_row — irrelevant in Dark Sun
    subtitle: null
    tag_row: null
    # Add campaign tag as badge
    badge: { path: "defiler_status", label: "Defiler/Preserver" }
```

---

### Layout Entities

Layouts declare how primitives are arranged within a view. They compose primitives into sections.

```yaml
# content/packs/srd-3.5e/layouts/character-sheet.mdx
---
id: "srd:layout:character-sheet"
entity_type: "layout"
properties:
  name: "D&D 3.5e Character Sheet"
  default_view_mode: "srd:view:dm-screen"

  sections:
    - id: "identity"
      component: block
      title: "Identity"
      children:
        - id: "name"; component: "text-field"; path: "identity.name"
        - id: "race-class"
          component: "computed-field"
          formula: "template.name + ' ' + class_levels"
          view_mode: "srd:view:reference"

    - id: "abilities"
      component: block
      title: "Ability Scores"
      children:
        - id: "str"
          component: "computed-field"
          formula: "abilities.str.score + abilities.str.racial_bonus"
          label: "STR"
        - id: "dex"
          component: "computed-field"
          formula: "abilities.dex.score + abilities.dex.racial_bonus"
          label: "DEX"
        # ... con, int, wis, cha

    - id: "combat"
      component: block
      title: "Combat"
      children:
        - id: "hp"
          component: "progress-bar"
          path: "combat.hp"
          max_path: "combat.max_hp"
          segments: 10
        - id: "ac"
          component: "computed-field"
          formula: "10 + abilities.dex.modifier + armor.bonus + shield.bonus"
          label: "AC"
        - id: "bab"
          component: "table"
          headers: ["Attack", "Bonus"]
          rows_path: "combat.iterative_attacks"    # references computed view
        - id: "saves"
          component: "table"
          headers: ["Save", "Base", "Ability", "Misc", "Total"]
          rows_path: "combat.saves_summary"        # references computed view

    - id: "skills"
      component: block
      title: "Skills"
      children:
        - id: "skill-list"
          component: "list"
          item_view_mode: "srd:view:table-row"
          source_path: "skills"
          filter: "is_class_skill or (rank > 0)"

    - id: "feats"
      component: block
      title: "Feats"
      children:
        - id: "feat-list"
          component: "list"
          item_view_mode: "srd:view:card"
          source_path: "feats"

    - id: "spells"
      component: block
      title: "Spells"
      children:
        - id: "spell-list"
          component: "list"
          item_view_mode: "srd:view:spell-card"
          source_path: "spells_known"
```

---

### Styling / Theming

Campaign packs declare visual theme. Engine provides CSS custom properties; content packs set their values.

```yaml
# campaigns/dark-sun-monday/styling/theme.mdx
---
id: "dark-sun:styling:theme"
entity_type: "styling"
properties:
  name: "Dark Sun Theme"
  description: "Wasteland heat and desiccated parchment"

  colors:
    primary: "#8B4513"      # Saddle brown — clay and leather
    secondary: "#D2691E"   # Chocolate — sun-scorched earth
    accent: "#CD853F"       # Peru — amber gem accents
    background: "#1a1410"   # Near-black with warm undertone
    background_alt: "#2a2018"
    surface: "#3a2a1a"      # Card/panel backgrounds
    text: "#f5f5dc"         # Beige — parchment text
    text_muted: "#a09080"
    error: "#8B0000"        # Dark red
    warning: "#D2691E"
    success: "#228B22"      # Forest green
    border: "#5a4030"

  typography:
    heading_font: "Uncial Antiqua"    # Medieval fantasy headers
    body_font: "Gentium Plus"          # Readable body text
    mono_font: "Fira Code"             # Ability scores, numbers
    heading_scale: 1.25
    body_size: 16px
    line_height: 1.6

  spacing:
    base_unit: 4px
    component_gap: 16px
    section_gap: 24px
    page_margin: 32px

  effects:
    card_shadow: "0 4px 12px rgba(0,0,0,0.4)"
    border_radius: 4px
    border_style: "rough"              # applies subtle texture overlay
    card_background: "parchment-dark"  # asset reference

  icons:
    set: "fantasy"                     # or "tactical", "minimal", "none"
    size: 20px

  view_mode_overrides:
    # Per-view-mode appearance tweaks
    "srd:view:spell-card":
      card_shadow: "0 2px 8px rgba(139,69,19,0.6)"
      border_color: "#8B4513"
```

### Theme Inheritance

```yaml
# A supplement extending Dark Sun inherits its theme automatically
---
id: "dark-sun-psionics:styling:theme"
entity_type: "styling"
extends: "dark-sun:styling:theme"
properties:
  name: "Dark Sun Psionics Theme"
  colors:
    accent: "#9932CC"    # Override just the accent — psionic purple
  effects:
    border_style: "psionic"  # Override effect for psionic-themed content
```

---

### Asset References

Content packs declare assets; engine resolves them:

```yaml
# In a view mode or layout
art_path: "art"           # resolved to asset from entity property or campaign override
thumbnail_path: "portrait"
background_texture: "parchment-001"
border_style: "rough"

# Engine resolves:
# 1. Check campaign pack assets/
# 2. Check source pack assets/
# 3. Fall back to engine-provided defaults
```

Assets live in `content/packs/{pack-id}/assets/` and are referenced by path.

---

### Custom Components

When built-in primitives aren't enough (Dread's Jenga tower):

```yaml
# campaigns/dread/layouts/jenga-scene.mdx
---
id: "dread:layout:jenga-scene"
entity_type: "layout"
properties:
  name: "Jenga Tower"
  template: plugin
  plugin: "dread:jenga-tower"
  config:
    height: 15
    tension_multiplier: 2
    theme: "dark-sun"      # inherits campaign theme
```

---

### Rendering Context

When the frontend requests an entity view, it passes:

```yaml
request:
  entity_id: "srd:spell:fireball"
  view_mode: "srd:view:spell-reference"  # or omit for default
  layout: "srd:layout:character-sheet"   # for full sheet rendering
  theme: "dark-sun:styling:theme"        # or omit for default
  context: "combat"                       # optional hint (combat vs browse vs selection)
```

Engine resolves the final view_mode + layout + theme by walking:
`request → campaign override → source → engine default`

---

## 8. Engine Architecture

**Spec:** `docs/engine-architecture/`

### What the Engine Owns

```
Engine
├── Pack Loader           # Parse manifest.yaml, MDX frontmatter, resolve dependencies
├── Schema Validator     # JSON Schema validation at pack load time (jsonschema crate)
├── Entity Store         # In-memory HashMap of all loaded entities
├── Event Log            # Append-only log of all state-changing operations
├── Queue Manager        # Nested speculative queues (transactional state)
├── Dispatcher           # Route events to matching subscriptions
├── Subscription Runner  # Evaluate predicate combinators, emit operations
├── Computed View Engine # Fold operations into derived values
├── Expression Eval      # Zen-expression WASM (Rust + JS, same evaluator)
├── Plugin Host          # Async (context → operations[]) escape hatch
├── IPC Layer            # Tauri IPC commands (create, select, assign, export, etc.)
├── Persistence          # Save/load campaign packs + event log
└── Permission Guard     # Enforce player/DM/observer permissions
```

### What the Engine Does NOT Know

- What STR means
- What a feat is
- How many hit points a Fighter has
- The order of character creation steps
- How BAB is computed

### What Content Packs Provide

- Mechanic entities (ability score def, skill def, save def, progression def)
- Template entities (races, classes)
- Rule entities (feats, class features, racial traits)
- Actionable entities (spells, powers, maneuvers)
- Workflow entities (character creation, level-up)
- Layout entities (character sheet structure)

### Zen-Expression WASM

Same evaluator on both platforms via WASM:

- Rust: `zen-expression` crate, compiled to WASM
- JS: WASM module loaded by Vite frontend
- Content authors write expressions once; they evaluate identically in engine and preview tools

### Computed View Dependency Resolution

Computed views declare their `inputs` explicitly. At pack load time, the engine:

1. Builds a dependency graph from all computed view `inputs` declarations
2. Topologically sorts the graph to determine evaluation order
3. If a cycle is detected, it is a **load error** — same severity as schema validation failure

No lazy resolution, no runtime cycle detection. The full graph is known at load time.

### Error Handling — Catch, Log, Continue

When a subscription fires and produces an invalid operation (bad path, type mismatch, division by zero in a formula):

1. The operation is **rejected** — not applied to state
2. A **diagnostic event** is appended to the event log with:
   - `type: "error"`
   - `source`: the subscription/entity that produced the invalid operation
   - `message`: human-readable description of what went wrong (see Principle 6: Graceful Chaos)
   - `attempted_op`: the operation that was rejected
   - `timestamp`
3. The engine **continues** — the game session is never interrupted by a content-pack error

Content authors debug by querying the event log for `type: "error"`. Schema validation catches structural problems at pack load time; runtime errors are operational and non-fatal.

### Content Pack Testing — `pack test`

A `pack test` subcommand for content authors (Phase 1 deliverable):

1. **Load** — parse pack in isolation, resolve `extends` chains
2. **Validate** — run all entities against their JSON Schemas
3. **Evaluate** — compute all computed views with mock entity state from test fixtures
4. **Subscribe** — fire all subscriptions against synthetic events, verify produced operations
5. **Report** — output results with clear pass/fail per entity

Test fixtures are YAML files alongside entities:

```yaml
# content/packs/srd-3.5e/entities/mechanics/ability-scores.test.yaml
fixtures:
  - name: "STR modifier for score 16"
    entity_state:
      abilities.strength.score: 16
    expect:
      abilities.strength.modifier: 3

  - name: "STR modifier for score 7"
    entity_state:
      abilities.strength.score: 7
    expect:
      abilities.strength.modifier: -2
```

This is a Phase 1 deliverable — Packwright agents need it immediately for dogfooding content pack authoring.

---

## 9. Migration Path

**Spec:** `docs/migration-path/`

Phased migration — app works throughout. Each phase dogfoods the engine and produces skills/personas.

### Phase 0 — Infrastructure
**Goal:** Set up agent infrastructure and dogfood the development environment

Deliverables:
- pnpm + sccache for worktree caching
- Playwright E2E test setup
- GitHub Actions self-hosted runner config for aibox (Ubuntu, Linux Tauri builds)
- Worktree-per-agent workflow documented
- Agent persona files (initial stubs): Arcanist, Packwright, Frontier, Chronicler, Tester, Sentinel

**Retrospective → skills:**
- Worktree setup procedure → skill
- Playwright authoring pattern → skill
- Aibox runner maintenance → skill

### Phase 1 — Content Pack Schema
**Goal:** Define all entity schemas and encode D&D 3.5e system definition

Deliverables:
- JSON Schema files for: mechanic, template, rule, actionable, object, container, workflow
- Full D&D 3.5e Mechanic entities (ability scores, skills, saves, progressions)
- Rust engine reads Mechanic entities at load time instead of hardcoded values
- All hardcoded ability/skill/save formulas replaced with content-pack lookups
- `pack test` subcommand — schema validation, computed view evaluation with fixtures, subscription firing against synthetic events
- Computed view dependency graph with topological sort and cycle detection at load time

**Dogfood:** Packwright agents encoding content — any friction in the schema format is a schema flaw. `pack test` is their primary feedback loop.

**Retrospective → skills + personas:**
- Schema authoring guide → skill
- Content pack validation errors → skill
- Content pack test fixture authoring → skill
- Packwright persona updated with D&D 3.5e domain knowledge

### Phase 2 — Predicate & Subscription Language
**Goal:** Implement Zen-expression WASM evaluator and subscription runner

Deliverables:
- Zen-expression WASM integrated into Rust engine and JS frontend
- All Arcanum subscription engine ports to new predicate combinator format
- Plugin escape hatch contract implemented (async `context → operations[]`)
- Rule of Cool forward-patch mechanism

**Dogfood:** Migrating existing subscriptions reveals expression language gaps

**Retrospective → skills + personas:**
- Zen-expression authoring guide → skill
- Predicate debugging patterns → skill
- Arcanist persona updated with predicate/subscription knowledge

### Phase 3 — Workflow Migration
**Goal:** Replace hardcoded wizard with data-driven workflow stepper

Deliverables:
- Character creation workflow defined in content pack
- Level-up, rest, combat round workflows defined
- React frontend uses generic workflow stepper driven by workflow entities
- All wizard step ordering/dependencies moved from Rust/React to content

**Dogfood:** Frontier agent implementing workflow stepper using the same API players use

**Retrospective → skills + personas:**
- Workflow authoring guide → skill
- Frontier persona updated with workflow engine knowledge

### Phase 4 — UI Primitive Mapping
**Goal:** Replace hardcoded character sheet with layout entity

Deliverables:
- Layout entity rendering engine
- D&D 3.5e character sheet layout entity
- All hardcoded combat/skill/ability display replaced with engine-driven layout

**Dogfood:** Character sheet rendering is the first thing players notice

**Retrospective → skills + personas:**
- Layout authoring guide → skill
- UI primitive debugging → skill

### Phase 5 — DM Authority + Campaign Model
**Goal:** Full campaign pack lifecycle and Rule of Cool

Deliverables:
- Campaign pack creation from source selection
- Copy-on-write override mechanism
- Event log viewer + Rule of Cool UI
- Permission guard enforcement
- Campaign publish (strip event log, freeze version)

**Dogfood:** Running a real game session with the campaign pack model

**Retrospective → skills + personas:**
- Campaign management guide → skill
- Rule of Cool patterns → skill
- Sentinel persona updated with permission model knowledge

### Phase 6 — Polish + Community
**Goal:** Multiple game systems and community content

Deliverables:
- 5e content pack (encoding 5e mechanics)
- Pathfinder 2e content pack
- Community campaign pack import/export
- Dependency resolution for stacked content packs
- AI storytelling layer integration for Rule of Cool notes

---

## 10. Agent System

**Spec:** `docs/agent-system/`

### Force Multiplication Discipline

After each phase:
1. Run agent retrospective — what did we learn building this?
2. Write/update skills for recurring patterns
3. Update agent personas with new domain knowledge
4. Dogfood check: does the engine help the next agent work faster?

### Personas

| Persona | Domain | Core Skills |
|---------|--------|-------------|
| **Arcanist** | Rust engine, event sourcing, subscriptions, computed views, IPC | Engine architecture, Rust debugging, event-sourced patterns |
| **Frontier** | React/TS frontend, Tauri IPC, component primitives, routing | Frontend architecture, Tauri integration, UI primitive mapping |
| **Packwright** | Content pack creation, JSON Schema, entity encoding, Zen-expression | Schema authoring, content validation, entity design |
| **Chronicler** | Documentation, spec writing, design docs, CLAUDE.md | Technical writing, design documentation, knowledge management |
| **Tester** | Playwright, proptest, integration tests, snapshot testing | Test architecture, deterministic game mechanics, CI/CD |
| **Sentinel** | Security, sandboxing, plugin contracts, permission model | Security review, plugin auditing, permission enforcement |

### Worktree Strategy

- Each agent works in an isolated git worktree
- Shared compilation cache via sccache
- Worktrees get unique VITE_PORT to avoid port conflicts
- Main branch is pristine — never worked on directly

---

## Key Technology Decisions

| Concern | Decision | Rationale |
|---------|----------|-----------|
| Expression language | Zen-expression (WASM) | Same evaluator on Rust + JS via WASM; expression-only design; funded by GoRules |
| Schema validation | JSON Schema (YAML) + jsonschema crate | Fits serde_json::Value natively; massive tooling ecosystem; Helm pattern |
| Cross-entity rules | Predicate combinators + computed views | Handles known cases; Rego (regorus) added only if we hit a concrete limitation |
| Worktree isolation | pnpm + sccache | pnpm symlinks from global store; sccache shares compiled deps across worktrees |
| Visual testing | Playwright E2E | Headless, deterministic, CI-friendly; ad-hoc agent verification via MCP browser tools |
| Build strategy | Per-platform runners | Cross-compilation for Tauri is unreliable; GitHub Actions matrix (Linux self-hosted, Win/Mac hosted) |
| Plugin escape hatch | Async `context → operations[]` contract | WASM/Lua compatible; all ops validated by engine; no bypassing the operation algebra |

---

## Open Questions

1. **Event log compaction** — At what point does the event log get compacted? After N events? On campaign publish? Who decides?
2. **Speculative execution UI** — When a player hovers over "what if I take this feat?", how does the UI show speculative state without committing?
3. **AI storytelling layer** — The Rule of Cool `note` field is an interface to an AI storytelling system we haven't designed yet. Should this be a plugin? A separate service?
4. **Multiplayer** — The engine is single-player today. Is multiplayer in scope for v2 or a future phase?
5. **Content pack versioning** — When a source pack updates (SRD errata), how do campaign packs declare compatibility ranges? Semantic versioning, or something simpler?
