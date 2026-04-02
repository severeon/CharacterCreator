# Arcanum Engine: Universal Tabletop State Machine

## Design Document — v0.2 DRAFT

**Authors:** Thomas, Claude (design partner)
**Date:** 2026-03-26
**Status:** Pre-implementation
**Target:** Tauri (Rust backend) + React/TypeScript frontend
**Initial scope:** D&D 3.5e, Hoyt's campaign — system-agnostic architecture, game-specific content

---

## 1. Problem Statement

Tabletop RPG rules are open-ended, combinatoric, and frequently contradictory across source materials. A tooling system that hardcodes game-specific logic into its type system will perpetually lag behind the content it needs to represent. Every new sourcebook, every house rule, every edge-case interaction becomes a code change.

We need an engine where **the rules are data, not code**. The engine provides universal primitives. Game systems, sourcebooks, campaigns, and house rules are all expressed as structured content that parameterizes those primitives.

---

## 2. Core Insight

Every tabletop RPG is an **event-driven state machine**. The way humans play these games is literally an event queue: someone declares an action, the table evaluates triggers and consequences, state changes, and play continues. Any event can produce more events. The "current state" of a game is the cumulative result of every event that has occurred.

This means:

- **State** is a materialized view, not the source of truth
- **The event log** is the source of truth
- **Rules** are subscriptions that react to events and emit operations (and possibly more events)
- **Undo/retcon** is log manipulation with conflict detection

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   React / TypeScript             │
│   Creation Wizard  ·  Character Sheet  ·  DM UI  │
│                                                   │
│   Sends: Commands (intents)                       │
│   Receives: Materialized state views              │
└──────────────────────┬──────────────────────────┘
                       │ Tauri IPC (command/query)
┌──────────────────────┴──────────────────────────┐
│                   Rust Engine                     │
│                                                   │
│  ┌─────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Content  │  │  Event   │  │   Operation    │  │
│  │  Packs   │  │  Queue   │  │   Algebra      │  │
│  │         │  │  System   │  │                │  │
│  └────┬────┘  └────┬─────┘  └───────┬────────┘  │
│       │            │                │            │
│  ┌────┴────────────┴────────────────┴─────────┐  │
│  │            Entity Store                     │  │
│  │   (schemaless property bags + subscriptions)│  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │         Event Log (append-only)             │  │
│  │         State Snapshots (rollback targets)  │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## 4. Primitives

### 4.1 Entity

A schemaless property bag. The engine does not know or care what a "hit point" is. Game systems define entity schemas through content packs.

```rust
struct Entity {
    id: Uuid,
    entity_type: String,              // "character", "item", "spell_effect", etc.
    prototype: Option<EntityRef>,     // content pack source (copy-on-write origin)
    source_pack: PackRef,             // which pack owns this entity
    properties: HashMap<String, Value>,
    subscriptions: Vec<Subscription>,
}
```

### 4.2 Value

Tagged union covering the full range of property types any game system might need.

```rust
enum Value {
    Int(i64),
    Float(f64),
    Bool(bool),
    Str(String),
    List(Vec<Value>),
    Map(HashMap<String, Value>),
    EntityRef(Uuid),
    Null,
}
```

### 4.3 Operation

The universal instruction set for modifying entity state. These are the **axioms** — every rule in every game system must decompose into some combination of these.

```rust
struct Operation {
    op: OpCode,
    target: EntityRef,
    path: String,                     // dot-notation: "skills.climb.ranks"
    value: Value,
    stack_rule: Option<StackRule>,
    source: String,                   // traceability: "phb.feat.power_attack"
}

enum OpCode {
    Set,        // absolute assignment
    Add,        // arithmetic addition
    Sub,        // arithmetic subtraction
    Multiply,   // arithmetic multiplication
    Grant,      // introduce a new property/capability
    Revoke,     // remove a property/capability
    Push,       // append to a list
    Pop,        // remove from a list
    Clear,      // reset to default/empty
}

enum StackRule {
    Additive,       // stacks with everything
    HighestWins,    // only the highest value applies
    LowestWins,     // only the lowest value applies
    Exclusive,      // cannot coexist with other ops on same path
    Named(String),  // stacking group — e.g., "enhancement", "morale"
}
```

### 4.4 Event

The unit of causality. Everything that happens in the system is an event. Events flow through queues. Handlers react to events by emitting operations and/or more events.

```rust
struct Event {
    id: Uuid,
    event_type: String,               // "character.level_up", "feat.granted"
    source: EntityRef,
    target: Option<EntityRef>,
    payload: HashMap<String, Value>,
    depth: u32,                        // call stack depth for cycle detection
    queue_id: Uuid,                    // which queue this event belongs to
    timestamp: u64,                    // logical clock, not wall time
}
```

### 4.5 Subscription

The binding between events and reactions. This is where game rules live. A feat, a racial trait, a class feature, a magic item — all are subscriptions installed on entities.

```rust
struct Subscription {
    id: Uuid,
    trigger: String,                   // event_type pattern (glob-able)
    predicate: Option<Predicate>,      // conditional: evaluate against current state
    effects: Vec<Operation>,
    priority: i32,                     // deterministic ordering for same-trigger conflicts
    source: String,                    // which rule installed this
}
```

### 4.6 Predicate

Conditional logic for subscription guards. Needs to be expressive enough to represent game rule conditions without being a full programming language.

```rust
enum Predicate {
    Eq(String, Value),                 // path == value
    Gt(String, Value),                 // path > value
    Lt(String, Value),                 // path < value
    Gte(String, Value),
    Lte(String, Value),
    In(String, Vec<Value>),            // path value is in set
    Has(String),                       // property exists
    Not(Box<Predicate>),
    And(Vec<Predicate>),
    Or(Vec<Predicate>),
    EntityHas(EntityRef, String),      // another entity has property
    InChangeset(String),               // property path was modified by the current queue
    PayloadEq(String, Value),          // event.payload[key] == value
}
```

### 4.7 Computed View

A declarative, pure-function projection of entity state. Analogous to a SQL view — it doesn't store data, it derives it. Distinct from Subscriptions, which are reactive (event → effect). Views are declarative (inputs → output, always).

```rust
struct ComputedView {
    id: Uuid,
    target: EntityRef,
    path: String,                      // where the computed value is exposed
    inputs: Vec<String>,               // property paths this view depends on
    computation: Computation,          // the pure function (see below)
    source: String,                    // traceability
    version: u64,                      // increments on rules changes
}
```

**Rules change handling:** When a campaign introduces a house rule that changes a computation (e.g., a different ability modifier formula), this is a new `ComputedView` with an incremented `version`. The engine emits a `view.rules_changed` event. The DM is prompted: "Apply retroactively, or from this point forward?" If retroactive, the retcon system handles the replay and conflict detection. If forward-only, the old version remains in the historical log and the new version applies from the current event timestamp onward.

**Computation type (initial):**

```rust
enum Computation {
    // Common math patterns — covers 90% of tabletop derived values
    Floor(Box<Computation>),
    Ceil(Box<Computation>),
    Div(Box<Computation>, Box<Computation>),
    Sub(Box<Computation>, Box<Computation>),
    Add(Box<Computation>, Box<Computation>),
    Mul(Box<Computation>, Box<Computation>),
    Min(Vec<Computation>),
    Max(Vec<Computation>),
    ReadPath(String),                  // read a property value as input
    Literal(Value),
    // Extensible — add variants as game systems demand them
}
```

Example: ability modifier = `floor((score - 10) / 2)`

```yaml
computed_views:
  - path: "abilities.strength.modifier"
    inputs: ["abilities.strength.score"]
    computation:
      floor:
        div:
          - sub:
            - read_path: "abilities.strength.score"
            - literal: 10
          - literal: 2
    source: "srd:rules:ability-modifiers"
    version: 1
```

---

## 5. Queue System

### 5.1 Why Nested Queues Are Load-Bearing

Character creation is a transaction. The state is speculative until every required choice has been made. A half-built character — race selected, bonus feat not yet allocated — is in an invalid intermediate state. Nothing should evaluate against it.

This isn't unique to character creation. Leveling up, resolving a complex spell interaction, processing a round of combat — all are transactions that must commit atomically or roll back cleanly.

### 5.2 Queue Structure

```rust
struct Queue {
    id: Uuid,
    parent: Option<Uuid>,             // nesting — None for root queue
    status: QueueStatus,
    events: Vec<Event>,
    snapshot: Option<StateSnapshot>,   // state at queue creation (rollback target)
    created_at: u64,                   // logical clock
    committed_at: Option<u64>,
}

enum QueueStatus {
    Pending,       // created, not yet processing
    Processing,    // actively handling events
    Committed,     // finalized — effects visible to parent
    RolledBack,    // abandoned — state reverted to snapshot
}
```

### 5.3 Queue Lifecycle Events

Queues are themselves entities in the event system. Their lifecycle emits events that other systems can subscribe to:

| Event | Meaning |
|---|---|
| `queue.created` | A new sub-queue was opened |
| `queue.event_processed` | An event within the queue was handled |
| `queue.committed` | The queue finalized — state changes visible to parent scope. Payload includes a **changeset summary**: which entity properties were modified by this queue. Subscriptions can predicate against changesets (e.g., "did hit_die change this level?"). |
| `queue.rolled_back` | The queue was abandoned — state reverted |
| `queue.drained` | All events in the queue have been processed (but queue may still be open for new events) |

### 5.4 Concurrency Model

**Synchronous within a queue.** Events in a single queue are processed in strict causal order. No async, no timeouts, no race conditions. Tabletop rules have deterministic ordering and the engine should enforce it.

**Concurrent across sibling queues.** Two players leveling up simultaneously are sibling queues on the same parent. Each operates against its own working copy of state (branched from the snapshot). Commit order determines write priority. Conflicts (both queues modified the same entity property) surface to the DM as a merge resolution prompt.

### 5.5 State Materialization

Current state is not a mutable object. It is:

```
state = fold(initial_state, committed_queue_tree)
```

Where the queue tree is walked **depth-first in commit order**. This means:

- Root queue commits first
- Child queues that committed before their siblings take precedence
- The "current state" at any point is reproducible by replaying the tree

---

## 6. Content Pack System

### 6.1 Pack Types

| Type | Mutable? | Purpose |
|---|---|---|
| `SOURCE` | No (after publish) | Published game content — PHB, DMG, sourcebooks |
| `CAMPAIGN` | Yes | A running game — derived entities, event logs, house rules |

### 6.2 Pack Manifest

```yaml
# manifest.yaml
id: "srd-3.5e"
name: "D&D 3.5e System Reference Document"
version: "1.0.0"
pack_type: source
dependencies: []
```

```yaml
# manifest.yaml
id: "hoyts-campaign"
name: "Hoyt's Campaign"
version: "0.1.0"
pack_type: campaign
dependencies:
  - pack: "srd-3.5e"
    version: "1.0.0"
  - pack: "complete-warrior"
    version: "1.0.0"
```

### 6.3 Copy-on-Write Entities

Content packs define **prototype entities**. These are immutable templates — the PHB definition of a Human, the stat block for a longsword, the feat description for Power Attack.

When a prototype enters a campaign (player selects Human, DM places a goblin), the campaign creates a **derived instance**:

- `prototype` field references the source pack entity
- Initial properties are copied from the prototype
- From this point, the campaign entity has its own event history
- The source pack prototype is never modified

This means:

- Multiple campaigns share source packs without interference
- Source pack updates (errata) can be rebased onto campaign entities
- Rebase conflicts surface to the DM as merge resolutions
- House rules are campaign-level subscriptions, not source pack modifications

### 6.4 File Structure

```
arcanum/
  packs/
    srd-3.5e/
      manifest.yaml
      entities/
        races/
          human.mdx           # YAML frontmatter + MDX body (embeds React components)
          dwarf.mdx
        classes/
          fighter.mdx
          wizard.mdx
        feats/
          power-attack.mdx
        items/
          longsword.mdx
      workflows/
        character-creation.mdx  # sequenced steps for character creation
        level-up.mdx            # class-dependent level-up flow
      subscriptions/
        racial-traits.yaml    # subscriptions installed by racial selection
        class-features.yaml
      computed-views/
        ability-modifiers.yaml
        save-calculations.yaml
        bab-progression.yaml

    hoyts-campaign/
      manifest.yaml
      house-rules/
        monster-class-restrictions.yaml  # campaign-level subscriptions
      entities/
        characters/
          thorin.mdx          # prototype: srd-3.5e/races/dwarf
          elena.mdx           # prototype: srd-3.5e/races/human
        npcs/
          barkeep.mdx
      events/
        log.jsonl             # append-only campaign event history
      snapshots/
        ...                   # queue snapshots for rollback
```

### 6.5 Entity Document Format (MDX)

Each entity is an MDX document with YAML frontmatter. The document is the single source of truth for both the engine and the UI. MDX allows embedding React components directly, meaning the display layer for any entity is part of its content pack — not hardcoded in the app.

```mdx
---
id: "srd:feat:power-attack"
entity_type: "feat"
properties:
  name: "Power Attack"
  category: "general"
  prerequisites:
    - type: "ability_score"
      ability: "strength"
      minimum: 13
    - type: "bab"
      minimum: 1
subscriptions:
  - trigger: "attack.melee.declared"
    predicate:
      and:
        - has: "active_flags.power_attack"
        - gte: ["bab", 1]
    effects:
      - op: Sub
        path: "attack.current_roll.modifier"
        value: "{power_attack_penalty}"
        source: "phb.feat.power_attack"
      - op: Add
        path: "damage.current_roll.modifier"
        value: "{power_attack_bonus}"
        source: "phb.feat.power_attack"
    priority: 50
assets:
  images:
    - ref: "power-attack-01.png"
    - ref: "power-attack-02.png"
---

# Power Attack

## Short Description

Trade attack bonus for damage on melee attacks.

## Rules Text

On your action, before making attack rolls for a round, you may choose
to subtract a number from all melee attack rolls and add the same number
to all melee damage rolls. This number may not exceed your base attack
bonus. The penalty on attacks and bonus on damage apply until your next
turn.

**Special:** If you attack with a two-handed weapon, or with a
one-handed weapon wielded in two hands, instead add twice the number
subtracted from your attack rolls. You can't add the bonus from Power
Attack to the damage dealt with a light weapon (except with unarmed
strikes or natural weapon attacks), even though the penalty on attack
rolls still applies.

## Long Description

A favorite of warriors who favor brute force over finesse, Power Attack
represents the deliberate sacrifice of accuracy for devastating impact...
```

---

## 7. Workflow System (MDX-Driven)

### 7.1 Workflows Are Data

Character creation, level-up, and other sequenced processes are not hardcoded in the UI. They are **workflow entities** defined in content packs. The engine drives the step sequence; the UI renders whatever the current step requires.

This means a different game system with different creation steps ships a different workflow document, and the same React app handles it.

### 7.2 Workflow Entity Structure

```mdx
---
id: "srd:workflow:character-creation"
entity_type: "workflow"
steps:
  - id: "select-race"
    required: true
    command: "select_race"
    unlocks: ["select-class", "assign-ability-scores"]
  - id: "select-class"
    required: true
    command: "select_class"
    depends_on: ["select-race"]
    unlocks: ["allocate-skills", "select-feats"]
  - id: "assign-ability-scores"
    required: true
    command: "assign_ability_scores"
    depends_on: ["select-race"]
  - id: "select-feats"
    required: true
    command: "select_feat"
    depends_on: ["select-class"]
    repeatable: true
    complete_when:
      eq: ["feat_slots.unfilled", 0]
  - id: "allocate-skills"
    required: true
    command: "allocate_skill_points"
    depends_on: ["select-class", "assign-ability-scores"]
  - id: "equipment"
    required: false
    command: "select_equipment"
    depends_on: ["select-class"]
---

# Character Creation

<WorkflowStepper workflow={entity} />

<StepContent step="select-race">
  ## Choose Your Race
  <EntitySelector
    choices={engine.getAvailableChoices("race")}
    display="card-grid"
  />
</StepContent>

<StepContent step="select-class">
  ## Choose Your Class
  <EntitySelector
    choices={engine.getAvailableChoices("class")}
    display="card-grid"
  />
</StepContent>

<StepContent step="assign-ability-scores">
  ## Ability Scores
  <AbilityScoreAllocator method={campaign.settings.score_method} />
</StepContent>
```

### 7.3 Level-Up Workflows

Level-up is the same pattern. The workflow steps depend on the class being taken — a Fighter level-up includes a bonus feat step; a Wizard level-up includes new spells known. The engine determines available steps based on the class entity's defined level-up workflow.

### 7.4 Generic UI Components

The React components referenced in MDX are **game-agnostic**:

- `WorkflowStepper` — renders step progression, back/forward, tracks completion
- `EntitySelector` — renders a filterable grid/list of entity choices from `getAvailableChoices`
- `StepContent` — conditional rendering based on current step
- `AbilityScoreAllocator` — parameterized by method (point buy, roll, standard array)

These components don't know about D&D. They render whatever the engine and workflow data tell them to.

---

## 8. Character Creation Flow

Character creation is a nested queue transaction driven by a workflow entity (§7). The wizard UI sends commands; the engine translates them into events within a creation sub-queue. State is speculative until the queue commits.

### 8.1 Event Sequence

```
1. Command: "create_character"
   → Engine opens Queue(status: Processing)
   → Emits: character.creation.started
   → Creates: Entity { type: "character", properties: {empty} }

2. Command: "select_race" { race: "srd:race:human" }
   → Engine opens child Queue for race application
   → Copies prototype properties from srd:race:human
   → Installs racial subscriptions (bonus feat, bonus skills, etc.)
   → Emits: race.selected { race: "human" }
   → Race subscriptions fire, emitting:
     → feat.slot.granted { slot_type: "bonus", count: 1 }
     → skill_points.bonus.granted { amount: 4 }  (1st level)
     → Emits: size.set, speed.set, etc.
   → Child queue status: PENDING (awaiting bonus feat selection)

3. Command: "select_class" { class: "srd:class:fighter", level: 1 }
   → Similar nested queue pattern
   → Class subscriptions install
   → Hit die, BAB, saves, proficiencies granted
   → Fighter bonus feat slot granted
   → Queue: PENDING (awaiting feat selections)

4. Command: "assign_ability_scores" { str: 16, dex: 14, ... }
   → Ability score operations applied
   → Modifier subscriptions fire (str 16 → str_mod +3)
   → Dependent calculations cascade (skill modifiers, save modifiers)

5. ... (feat selection, skill allocation, equipment, etc.)

6. Command: "finalize_character"
   → Engine validates: all required properties set, no PENDING child queues
   → If valid: all queues commit depth-first
   → character.creation.completed event emits on parent queue
   → Character entity is now a fully materialized campaign entity
   → If invalid: engine returns list of unresolved requirements
```

### 8.2 UI Implications

The frontend doesn't need to know 3.5e rules. It needs to:

1. Send commands for user choices
2. Receive the current speculative state (for display)
3. Receive a list of "what's still needed" (to know which wizard steps remain)
4. Receive validation results on finalize

The creation wizard is **driven by the engine**, not hardcoded in the UI. A different game system with different creation steps would produce different "what's still needed" responses, and the wizard adapts.

---

## 9. Level-Boundary State Diffing

### 9.1 Problem

Hoyt's campaign uses monster classes with house rules that constrain character progression based on whether certain properties changed at the current level (e.g., "if hit die didn't change this level, you can't take a feat from category X"). This requires inspecting the **delta** between pre-level and post-level state.

### 9.2 Mechanism

This falls out naturally from the queue system. Every level-up is a nested queue. Every queue snapshots state at creation. Therefore:

```
level_delta = diff(queue.snapshot, post_commit_state)
```

The `queue.committed` event payload includes a **changeset summary** — a structured list of which entity properties were modified by that queue's events. Any subscription can predicate against this changeset.

### 9.3 Example: Monster Class Hit Die Rule

```yaml
# hoyts-campaign/house-rules/monster-class-restrictions.yaml
subscriptions:
  - trigger: "queue.committed"
    predicate:
      and:
        - eq: ["event.payload.queue_type", "level_up"]
        - not:
            in_changeset: "hit_die"
    effects:
      - op: Push
        target: "{event.payload.entity_id}"
        path: "restrictions.active"
        value:
          type: "feat_category_lock"
          categories: ["combat", "metamagic"]
          reason: "Monster class hit die unchanged this level"
          until: "next_level"
        source: "hoyts-campaign:house-rule:monster-hd-restriction"
    priority: 100
    source: "hoyts-campaign:house-rule:monster-hd-restriction"
```

This is a campaign-level subscription, not a source pack modification. The SRD content is untouched.

---

## 10. Retcon / Rewind System

### 10.1 Mechanism

The event log is append-only during normal play. Retcon is implemented as:

1. DM selects a point in history to modify
2. Engine identifies the committed queue at that point
3. Engine rolls back to that queue's snapshot
4. DM makes changes (new events replace old ones)
5. Engine replays all subsequent committed queues against the new state
6. **Conflict detection:** For each replayed queue, engine checks if any property it reads was modified by the retcon. If so, flag it.
7. DM resolves conflicts (the "git merge" UX)
8. New history commits, old history is preserved as a branch (not deleted)

### 10.2 Conflict Surfacing

```
DM retcons: "Actually, Thorin found a +2 sword in that dungeon, not a +1"

Engine detects:
  - Queue "combat-round-47" read Thorin's attack modifier
  - Thorin's attack modifier changes due to retcon (+1 difference)
  - Combat outcome may have differed

Engine surfaces:
  "Thorin's attack roll in round 47 was 18 (hit). With the +2 sword
   it would have been 19 (still hit). No gameplay impact."

  "Thorin's attack roll in round 52 was 14 (miss). With the +2 sword
   it would have been 15 (hit). This changes the outcome. How do
   you want to handle this?"
```

---

## 11. Pack-Level Auditor

### 11.1 Purpose

Validates that content packs are internally consistent and fully representable by the engine.

### 11.2 Checks

| Check | Scope | Description |
|---|---|---|
| **Schema completeness** | Source pack | Every entity property is a valid `Value` type |
| **Operation coverage** | Source pack | Every subscription's effects use valid `OpCode`s |
| **Predicate satisfiability** | Source pack | No subscriptions with predicates that can never be true |
| **Orphaned events** | Source pack | Event types emitted but never subscribed to |
| **Dead subscriptions** | Source pack | Subscriptions whose trigger events are never emitted |
| **Cycle detection** | Source pack | Subscription A triggers B triggers A |
| **Dependency resolution** | Campaign | All manifest dependencies present and version-locked |
| **Prototype integrity** | Campaign | Every derived entity's prototype exists in a dependency |
| **Name collisions** | Cross-pack | Same entity ID or name with different semantics across packs |
| **Stack rule conflicts** | Cross-pack | Operations from different packs targeting same path with incompatible stack rules |

---

## 12. Rust Crate Structure (Proposed)

```
arcanum-engine/
  crates/
    arcanum-core/          # Entity, Value, Operation, Event, Subscription, Predicate, ComputedView
    arcanum-queue/         # Queue system, nesting, commit/rollback, snapshots, changeset diffing
    arcanum-dispatch/      # Event dispatch loop, subscription matching, cycle detection
    arcanum-views/         # ComputedView evaluation, dependency tracking, version management
    arcanum-packs/         # Content pack loading, manifest parsing, MDX entity documents
    arcanum-workflows/     # Workflow entities, step sequencing, dependency resolution
    arcanum-audit/         # Pack-level validation and conformance checking
    arcanum-persist/       # Event log storage, snapshot serialization, SQLite/file backend
    arcanum-tauri/         # Tauri command/query IPC bindings
```

---

## 13. Frontend Boundary (Command/Query Split)

The React frontend communicates exclusively through Tauri IPC. It never owns or mutates state.

**Commands (frontend → engine):**
- `start_workflow { workflow_id, entity_id }` — begin a workflow (creation, level-up, etc.)
- `workflow_step { workflow_id, step_id, command, payload }` — execute a step
- `workflow_back { workflow_id, step_id }` — roll back to before a step
- `workflow_finalize { workflow_id }` — commit the workflow queue
- `retcon { target_queue_id, modifications }`

**Queries (engine → frontend):**
- `get_materialized_state { entity_id }` → full property map
- `get_speculative_state { entity_id, queue_id }` → state including uncommitted queue
- `get_workflow_status { workflow_id }` → completed steps, pending steps, available next steps
- `get_available_choices { slot_type, entity_id }` → valid options given current state
- `get_level_delta { entity_id, queue_id }` → changeset summary for a level-up queue
- `validate { queue_id }` → list of issues

The character sheet renderer is a **pure function**: `materialized_state → printable view`. Zero logic.

---

## 14. Design Decisions (Resolved)

1. **Parameterized subscriptions:** Event payload carries parameters. Power Attack's penalty/bonus chosen each round → value lives in the triggering event's payload, referenced as `{power_attack_penalty}` in subscription effects.

2. **Computed properties:** New primitive — `ComputedView` (§4.7). Pure function, analogous to SQL views. Versioned to handle mid-campaign rules changes with DM choice of retroactive vs. forward-only application.

3. **Effect ordering within a subscription:** Sequential, first-come-first-served. Idempotency is a design goal — operations should produce the same result regardless of redundant application. Revisit if this proves insufficient.

4. **Query language:** Deferred. Build the algebra, learn what queries the system actually needs through use.

5. **Art generation pipeline:** Deferred. Entity documents reference asset manifests. Generation is a future UI-layer concern.

6. **Entity documents are MDX:** Enables embedding React components in entity display, workflow step UIs, and content-pack-specific presentation without app code changes.

7. **Workflows are data:** Character creation, level-up, and other sequenced processes are workflow entities defined in content packs (§7). The UI renders generic components driven by workflow data.

---

## 15. Open Questions

1. **Predicate expressiveness ceiling:** The `Predicate` enum (§4.6) needs stress testing against the gnarliest 3.5e prerequisite chains, metamagic interactions, and Hoyt's house rules. May need a lightweight expression language if the enum proves insufficient. **Test during implementation, not in advance.**

2. **Computation expressiveness:** The `Computation` enum (§4.7) covers arithmetic. Some game systems may need string operations, conditional branching, or table lookups in computed views. Extend as encountered.

3. **`in_changeset` predicate:** Used in §9.3 for level-boundary diffing. This is a new predicate type not yet in §4.6. Needs to be added to the `Predicate` enum — probably `InChangeset(String)` where the string is a property path.

4. **Game system definition boundary:** We're building for 3.5e now. The line between "universal engine" and "3.5e-specific content" should be documented as a parallel effort. Watch for assumptions that leak game-specific logic into engine code.

---

## 16. Validation Target

The engine is correct when the following scenarios all resolve correctly through the event/queue system:

**Scenario A: Multiclass Human Fighter/Wizard at level 5**

- Human racial bonuses (bonus feat, bonus skill points)
- Fighter class features (bonus feats, weapon proficiencies)
- Wizard class features (spellcasting, familiar, scribe scroll)
- Multiclass XP penalty evaluation
- Ability score modifiers cascading to skills, saves, attack bonus (via ComputedViews)
- Feat prerequisites checked against current state
- Skill point allocation respecting class/cross-class costs
- BAB, saves computed from multiclass progression

**Scenario B: Monster class level-up with Hoyt's house rules**

- Level-up queue commits and emits changeset
- House rule subscription inspects changeset for hit die change
- Feat category restrictions applied/not applied based on changeset
- `get_level_delta` query returns correct diff to the UI

**Scenario C: Workflow-driven creation**

- Character creation workflow loads from source pack MDX
- Each step dispatches through `workflow_step` commands
- Back button rolls back step's sub-queue without corrupting prior steps
- Finalize commits entire nested queue tree atomically
- Invalid finalize (unfilled required steps) returns actionable error list

**Scenario D: Retcon**

- DM modifies a past event
- Engine replays subsequent queues
- Conflicts detected and surfaced with enough context for DM resolution
- Non-conflicting state is preserved without DM intervention

If all four scenarios produce correct, hand-verifiable results, the core engine works.

---

*This is a living document. Update as implementation reveals what the design missed.*
