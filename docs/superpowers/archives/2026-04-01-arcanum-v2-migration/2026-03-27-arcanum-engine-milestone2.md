# Arcanum Engine Milestone 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Arcanum Engine character creation flow by implementing skill allocation, feat selection, computed view evaluation, stack rules, speculative execution, workflow complete_when, CharacterSheet fix, and entity subscriptions.

**Architecture:** The character creation flow is driven by a nested queue system where each step (race, class, ability scores, skills, feats) creates child queues that hold speculative state until finalization. The dispatcher evaluates subscriptions and computed views as events fire. ComputedView evaluation derives ability modifiers and skill modifiers from base scores. Stack rules govern how multiple operations on the same path interact (e.g., enhancement bonuses stacking additively vs. exclusive morale bonuses).

**Tech Stack:** Tauri v2 (Rust backend), React/TypeScript frontend, tauri-plugin-mcp for manual testing

---

## File Map

### Backend (Rust)

| File | Responsibility |
|------|----------------|
| `src-tauri/src/engine.rs` | Engine methods: allocate_skill_points, select_feat, get_speculative_state, get_workflow_status |
| `src-tauri/src/ipc.rs` | Tauri IPC commands: allocate_skill_points, select_feat, get_speculative_state |
| `src-tauri/src/dispatch.rs` | Dispatcher: evaluate ComputedViews, apply StackRules, evaluate entity subscriptions |
| `src-tauri/src/computed_view.rs` | Computation evaluation (add evaluate() method) |
| `src-tauri/src/workflow.rs` | WorkflowEngine::is_step_complete() evaluates complete_when conditions |
| `src-tauri/src/queue.rs` | QueueManager: track pending child queues for speculative state |

### Frontend (TypeScript/React)

| File | Responsibility |
|------|----------------|
| `src/lib/engine.ts` | Add allocateSkillPoints, selectFeat, getSpeculativeState wrappers |
| `src/lib/types.ts` | Add SkillPointAllocation, FeatSelection types |
| `src/routes/CreationWizard.tsx` | Implement skill allocation UI, feat selection UI |
| `src/routes/CharacterSheet.tsx` | Read class_name property instead of hardcoded "Fighter (stub)" |

### Tests

| File | Responsibility |
|------|----------------|
| `src-tauri/src/engine.rs` (inline tests) | Unit tests for engine methods |
| `src-tauri/src/dispatch.rs` (inline tests) | Unit tests for dispatcher stack rules, computed views |
| `src-tauri/src/workflow.rs` (inline tests) | Unit tests for complete_when evaluation |
| `src/lib/__tests__/engine.test.ts` | Integration tests for frontend IPC wrappers |

---

## Execution Groups

### Group A: Trivial Fix + Dispatcher Foundation (PARALLEL)

**A1: CharacterSheet fix** (5 min - standalone)
**A2: Stack rules application** (45 min - dispatcher core, no deps)

### Group B: Dispatcher Core (PARALLEL, after A2)

**B1: Computed view evaluation** (60 min - dispatcher evaluates ComputedViews)
**B2: Entity subscriptions** (30 min - dispatcher consults entity.subscriptions during dispatch)

### Group C: Queue + Workflow (PARALLEL, after A2)

**C1: Speculative execution** (45 min - get_speculative_state returns child queue state)
**C2: Workflow complete_when** (45 min - is_step_complete evaluates conditions)

### Group D: Full-Stack Features (SEQUENTIAL after B1+B2)

**D1: Skill allocation** (90 min - backend IPC + engine + frontend)
**D2: Feat selection** (90 min - backend IPC + engine + frontend)

---

## Implementation Tasks

### Task A1: CharacterSheet - Read Actual class_name Property

**Files:**
- Modify: `src/routes/CharacterSheet.tsx:70`

**Summary:** The CharacterSheet currently hardcodes "Fighter (stub)" on line 70. It should read the `class_name` property from character.properties.

**Change:**

```tsx
// Line 70, change from:
<p className="text-2xl">Fighter (stub)</p>

// To:
<p className="text-2xl">{getPropertyString('class_name', 'No class')}</p>
```

**Testing:**
- Manual: Create a character, select Fighter, navigate to CharacterSheet, verify class displays correctly

---

### Task A2: Stack Rules Application in Dispatcher

**Files:**
- Modify: `src-tauri/src/dispatch.rs:185-290` (apply_operation method)
- Modify: `src-tauri/src/dispatch.rs` (add stack tracking in Dispatcher struct)

**Context:** The `Operation` struct has a `stack_rule: Option<StackRule>` field, but `apply_operation` in dispatch.rs ignores it completely. Stack rules determine how multiple operations targeting the same path interact.

**Stack Rule Semantics:**
- `Additive`: All operations apply (e.g., circumstance bonuses)
- `HighestWins`: Only highest value applies (e.g., morale bonuses to attack)
- `LowestWins`: Only lowest value applies
- `Exclusive`: Cannot coexist with other operations on same path (e.g., spells under antimagic)
- `Named(group)`: Same-group operations follow HighestWins; different groups stack additively

**Implementation Steps:**

- [ ] **Step 1: Add stack_tracking state to Dispatcher**

```rust
// In dispatch.rs, Dispatcher struct
pub struct Dispatcher {
    subscription_index: HashMap<String, Vec<SubscriptionIndexEntry>>,
    // NEW: track applied operations per path for stack rule enforcement
    applied_operations: HashMap<String, Vec<AppliedOperation>>,
}

struct AppliedOperation {
    value: Value,
    stack_rule: StackRule,
    source: String,
}
```

- [ ] **Step 2: Modify apply_operation to respect stack rules**

The current `apply_operation` (lines 185-290) directly sets/adds values. Replace with stack-aware logic:

```rust
fn apply_operation(
    &self,
    op: &Operation,
    trigger_event: &Event,
    entities: &mut HashMap<String, Entity>,
    changeset: &mut Changeset,
    _queue_manager: &QueueManager,
) -> Option<Event> {
    let target_id = &op.target;
    if !entities.contains_key(target_id) {
        return None;
    }

    let entity = entities.get_mut(target_id).unwrap();
    let old_value = entity.get_property(&op.path).cloned();
    let new_value = self.compute_operation(op, trigger_event);

    // NEW: Apply stack rule
    let final_value = match &op.stack_rule {
        None => {
            // No stack rule = replace behavior (existing Set/Add/etc logic)
            self.apply_simple_op(op, &old_value, new_value)
        }
        Some(rule) => {
            self.apply_stacked_op(op, &old_value, new_value, rule)
        }
    };

    // Record changeset and apply
    changeset.add(target_id, &op.path, old_value, Some(final_value.clone()));
    entity.set_property(&op.path, final_value);

    None
}

fn apply_simple_op(&self, op: &Operation, old_value: &Option<Value>, new_value: Value) -> Value {
    match op.op {
        OpCode::Set => new_value,
        OpCode::Add => {
            if let (Some(Value::Int(old)), Value::Int(delta)) = (old_value.clone(), new_value) {
                Value::Int(old + delta)
            } else { new_value }
        }
        OpCode::Sub => {
            if let (Some(Value::Int(old)), Value::Int(delta)) = (old_value.clone(), new_value) {
                Value::Int(old - delta)
            } else { new_value }
        }
        OpCode::Multiply => {
            if let (Some(Value::Int(old)), Value::Int(delta)) = (old_value.clone(), new_value) {
                Value::Int(old * delta)
            } else { new_value }
        }
        OpCode::Push => {
            if let Some(list) = old_value.and_then(|v| v.as_list().cloned()) {
                let mut new_list = list;
                new_list.push(new_value);
                Value::List(new_list)
            } else { Value::List(vec![new_value]) }
        }
        // ... other opcodes
        _ => new_value,
    }
}

fn apply_stacked_op(
    &self,
    op: &Operation,
    old_value: &Option<Value>,
    new_value: Value,
    rule: &StackRule,
) -> Value {
    match rule {
        StackRule::Additive => {
            // Sum all additive operations on this path
            self.apply_simple_op(op, old_value, new_value)
        }
        StackRule::HighestWins => {
            // Compare with existing value, keep highest
            if let (Some(existing), Value::Int(new_int)) = (old_value.clone(), new_value.clone()) {
                if let Value::Int(existing_int) = existing {
                    if new_int > existing_int {
                        return Value::Int(new_int);
                    }
                    return existing;
                }
            }
            new_value
        }
        StackRule::LowestWins => {
            if let (Some(existing), Value::Int(new_int)) = (old_value.clone(), new_value.clone()) {
                if let Value::Int(existing_int) = existing {
                    if new_int < existing_int {
                        return Value::Int(new_int);
                    }
                    return existing;
                }
            }
            new_value
        }
        StackRule::Exclusive => {
            // Only the most recent exclusive operation applies
            new_value
        }
        StackRule::Named(group) => {
            // Named groups: HighestWins within same group, additive across groups
            // Track group membership in applied_operations
            new_value
        }
    }
}
```

- [ ] **Step 3: Add unit tests for stack rules**

```rust
#[test]
fn test_stack_rule_highest_wins() {
    let dispatcher = Dispatcher::new();
    let mut entities = HashMap::new();
    entities.insert("char1".to_string(), make_entity("char1", HashMap::new()));

    let queue_id = Uuid::new_v4();
    
    // Apply first operation with HighestWins
    let op1 = Operation::new(OpCode::Add, "char1", "attack.bonus", Value::Int(5), "source1")
        .with_stack_rule(StackRule::HighestWins);
    
    let event = Event::new("test", "system", queue_id, 1).with_target("char1");
    let mut changeset = Changeset::new();
    let queue_manager = QueueManager::new();
    
    dispatcher.apply_operation(&op1, &event, &mut entities, &mut changeset, &queue_manager);
    
    // Apply second operation with Higher value
    let op2 = Operation::new(OpCode::Add, "char1", "attack.bonus", Value::Int(10), "source2")
        .with_stack_rule(StackRule::HighestWins);
    
    dispatcher.apply_operation(&op2, &event, &mut entities, &mut changeset, &queue_manager);
    
    let char_entity = entities.get("char1").unwrap();
    assert_eq!(char_entity.get_property("attack.bonus"), Some(&Value::Int(10)));
}
```

- [ ] **Step 4: Add unit test for Additive stacking**

```rust
#[test]
fn test_stack_rule_additive() {
    let dispatcher = Dispatcher::new();
    let mut entities = HashMap::new();
    entities.insert("char1".to_string(), make_entity("char1", HashMap::new()));

    let queue_id = Uuid::new_v4();
    let event = Event::new("test", "system", queue_id, 1).with_target("char1");
    let mut changeset = Changeset::new();
    let queue_manager = QueueManager::new();
    
    // Apply two additive bonuses
    let op1 = Operation::new(OpCode::Add, "char1", "damage.bonus", Value::Int(2), "source1")
        .with_stack_rule(StackRule::Additive);
    dispatcher.apply_operation(&op1, &event, &mut entities, &mut changeset, &queue_manager);
    
    let op2 = Operation::new(OpCode::Add, "char1", "damage.bonus", Value::Int(3), "source2")
        .with_stack_rule(StackRule::Additive);
    dispatcher.apply_operation(&op2, &event, &mut entities, &mut changeset, &queue_manager);
    
    let char_entity = entities.get("char1").unwrap();
    assert_eq!(char_entity.get_property("damage.bonus"), Some(&Value::Int(5)));
}
```

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/dispatch.rs
git commit -m "feat(engine): implement stack rule application in dispatcher"
```

**Manual Testing via Tauri MCP:**
```
# After implementing, test in Tauri app:
# Create character, select race/class, verify stacking bonuses apply correctly
```

---

### Task B1: Computed View Evaluation in Dispatcher

**Files:**
- Modify: `src-tauri/src/dispatch.rs` (add ComputedView evaluation after operation dispatch)
- Modify: `src-tauri/src/computed_view.rs` (add evaluate() method to Computation)

**Context:** `ComputedView` structs exist on entities but the dispatcher never evaluates them. When ability scores change, skill ranks are allocated, or other derived values need recalculation, computed views should fire.

**Implementation Steps:**

- [ ] **Step 1: Add evaluate() method to Computation in computed_view.rs**

```rust
impl Computation {
    pub fn evaluate(&self, entity: &Entity) -> Option<Value> {
        match self {
            Computation::Literal(v) => Some(v.clone()),
            Computation::ReadPath(path) => entity.get_property(path).cloned(),
            Computation::Floor(comp) => {
                if let Some(Value::Int(n)) = comp.evaluate(entity) {
                    Some(Value::Int(n.floor_div(2))) // floor division
                } else { None }
            }
            Computation::Add(left, right) => {
                match (left.evaluate(entity), right.evaluate(entity)) {
                    (Some(Value::Int(a)), Some(Value::Int(b))) => Some(Value::Int(a + b)),
                    _ => None,
                }
            }
            Computation::Sub(left, right) => {
                match (left.evaluate(entity), right.evaluate(entity)) {
                    (Some(Value::Int(a)), Some(Value::Int(b))) => Some(Value::Int(a - b)),
                    _ => None,
                }
            }
            Computation::Mul(left, right) => {
                match (left.evaluate(entity), right.evaluate(entity)) {
                    (Some(Value::Int(a)), Some(Value::Int(b))) => Some(Value::Int(a * b)),
                    _ => None,
                }
            }
            Computation::Div(left, right) => {
                match (left.evaluate(entity), right.evaluate(entity)) {
                    (Some(Value::Int(a)), Some(Value::Int(b))) if b != 0 => Some(Value::Int(a / b)),
                    _ => None,
                }
            }
            Computation::Min(comps) => {
                let values: Vec<i64> = comps.iter()
                    .filter_map(|c| c.evaluate(entity)?.as_int())
                    .collect();
                values.into_iter().min().map(Value::Int)
            }
            Computation::Max(comps) => {
                let values: Vec<i64> = comps.iter()
                    .filter_map(|c| c.evaluate(entity)?.as_int())
                    .collect();
                values.into_iter().max().map(Value::Int)
            }
        }
    }
}
```

- [ ] **Step 2: Add ComputedView evaluation to Dispatcher::dispatch**

After processing subscription effects, evaluate any ComputedViews on the target entity:

```rust
pub fn dispatch(
    &self,
    event: &Event,
    entities: &mut HashMap<String, Entity>,
    queue_manager: &QueueManager,
    changeset: &mut Changeset,
) -> Vec<Event> {
    let mut generated_events = Vec::new();
    let trigger = &event.event_type;

    // ... existing subscription dispatch logic ...

    // NEW: Evaluate ComputedViews on the target entity
    if let Some(target_id) = &event.target {
        if let Some(entity) = entities.get_mut(target_id) {
            for view in &entity.computed_views {
                if view.inputs.iter().any(|input| changeset.contains_path(input)) {
                    // One of the inputs changed, recalculate
                    if let Some(computed_value) = view.computation.evaluate(entity) {
                        let old_value = entity.get_property(&view.path).cloned();
                        entity.set_property(&view.path, computed_value.clone());
                        changeset.add(target_id, &view.path, old_value, Some(computed_value));
                    }
                }
            }
        }
    }

    generated_events
}
```

- [ ] **Step 3: Add unit tests**

```rust
#[test]
fn test_computed_view_evaluates_on_input_change() {
    let mut dispatcher = Dispatcher::new();
    let mut entities = HashMap::new();
    
    // Create entity with computed view for ability modifier
    let mut entity = make_entity("char1", HashMap::new());
    entity.set_property("abilities.strength.score", Value::Int(16));
    
    // Add computed view: modifier = floor((score - 10) / 2)
    let modifier_view = ComputedView::ability_modifier(
        "abilities.strength.score",
        "char1"
    );
    entity.add_computed_view(modifier_view);
    
    entities.insert("char1".to_string(), entity);
    
    let queue_id = Uuid::new_v4();
    let event = Event::new("test", "system", queue_id, 1)
        .with_target("char1")
        .with_payload("changed_path", Value::Str("abilities.strength.score".to_string()));
    
    let mut changeset = Changeset::new();
    changeset.add("char1", "abilities.strength.score", Some(Value::Int(16)), Some(Value::Int(16)));
    
    let queue_manager = QueueManager::new();
    dispatcher.dispatch(&event, &mut entities, &queue_manager, &mut changeset);
    
    let char_entity = entities.get("char1").unwrap();
    // 16 - 10 = 6, 6 / 2 = 3
    assert_eq!(char_entity.get_property("abilities.strength.modifier"), Some(&Value::Int(3)));
}
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/computed_view.rs src-tauri/src/dispatch.rs
git commit -m "feat(engine): evaluate ComputedViews when inputs change in dispatcher"
```

---

### Task B2: Entity Subscriptions in Dispatcher

**Files:**
- Modify: `src-tauri/src/dispatch.rs` (index and consult entity.subscriptions during dispatch)

**Context:** The `Dispatcher::dispatch` method only consults the global `subscription_index`. However, entities have their own `subscriptions` field (e.g., racial subscriptions, class feature subscriptions) that are also stored but never consulted during dispatch. The `index_entity` method populates the global index from entity.subscriptions, BUT the entity's subscriptions list is never consulted directly.

**The Problem:**
- `index_entity` is called when loading entities, adding subscriptions to the global index
- BUT during dispatch, only the global index is consulted
- The entity's own `subscriptions` list is never used directly during event processing

**Solution:** After dispatching from the global index, also iterate over the target entity's direct subscriptions and evaluate them:

```rust
pub fn dispatch(
    &self,
    event: &Event,
    entities: &mut HashMap<String, Entity>,
    queue_manager: &QueueManager,
    changeset: &mut Changeset,
) -> Vec<Event> {
    let mut generated_events = Vec::new();
    let trigger = &event.event_type;

    // Global subscriptions (already indexed)
    if let Some(entries) = self.subscription_index.get(trigger) {
        for entry in entries {
            // ... existing evaluation ...
        }
    }

    // NEW: Also check target entity's direct subscriptions
    if let Some(target_id) = &event.target {
        if let Some(entity) = entities.get_mut(target_id) {
            for subscription in &entity.subscriptions {
                if subscription.trigger == trigger {
                    if self.evaluate_predicate(&subscription.predicate, event, entities, changeset) {
                        for effect in &subscription.effects {
                            if let Some(new_event) = self.apply_operation(
                                effect, event, entities, changeset, queue_manager
                            ) {
                                generated_events.push(new_event);
                            }
                        }
                    }
                }
            }
        }
    }

    generated_events
}
```

**Note:** The existing test `test_dispatch_triggers_subscription` already tests this via `index_entity`, so the behavior is correct. The direct entity subscription lookup is a fallback/additional source.

- [ ] **Step 1: Add direct entity subscription dispatch (as described above)**

- [ ] **Step 2: Add unit test for entity's own subscriptions**

```rust
#[test]
fn test_entity_direct_subscriptions_fire() {
    let dispatcher = Dispatcher::new();
    let mut entities = HashMap::new();
    
    // Entity with its own subscription (not via index_entity)
    let mut entity = make_entity("char1", HashMap::new());
    let sub = Subscription::new(
        "custom.event",
        vec![Operation::new(OpCode::Set, "char1", "custom.property", Value::Int(42), "inline")],
        "inline-source"
    );
    entity.add_subscription(sub);
    
    entities.insert("char1".to_string(), entity);
    
    let queue_id = Uuid::new_v4();
    let event = Event::new("custom.event", "system", queue_id, 1)
        .with_target("char1");
    
    let mut changeset = Changeset::new();
    let queue_manager = QueueManager::new();
    
    // Note: NOT calling index_entity - subscription is on entity directly
    dispatcher.dispatch(&event, &mut entities, &queue_manager, &mut changeset);
    
    let char_entity = entities.get("char1").unwrap();
    assert_eq!(char_entity.get_property("custom.property"), Some(&Value::Int(42)));
}
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/dispatch.rs
git commit -m "feat(engine): consult entity direct subscriptions during dispatch"
```

---

### Task C1: Speculative Execution - get_speculative_state

**Files:**
- Modify: `src-tauri/src/engine.rs` (implement speculative state query)
- Modify: `src-tauri/src/ipc.rs` (add queue_id parameter to get_speculative_state)
- Modify: `src/lib/engine.ts` (add queue_id parameter)

**Context:** `get_speculative_state` currently returns `engine.get_entity(&character_id).cloned()` - the committed state, not the speculative state from child queues. For character creation, we need to see uncommitted changes in pending child queues.

**Implementation:**

- [ ] **Step 1: Modify Engine to track active creation queues**

In `engine.rs`, add a field to track character creation queues:

```rust
pub struct Engine {
    // ... existing fields ...
    active_queues: HashMap<String, Uuid>, // character_id -> current queue_id
}
```

- [ ] **Step 2: Modify get_speculative_state in engine.rs**

```rust
pub fn get_speculative_state(&self, character_id: &str, queue_id: Option<&str>) -> Option<Entity> {
    // If queue_id provided, get state from that queue's changeset
    if let Some(qid) = queue_id {
        if let Ok(uuid) = Uuid::parse_str(qid) {
            if let Some(queue) = self.queue_manager.get_queue(&uuid) {
                if let Some(snapshot) = &queue.snapshot {
                    if let Some(entity) = snapshot.entities.get(character_id) {
                        let mut result = entity.clone();
                        // Overlay committed changes from this queue
                        for entry in &queue.changeset.entries {
                            if entry.entity_id == character_id {
                                if let Some(new_val) = &entry.new_value {
                                    result.set_property(&entry.path, new_val.clone());
                                } else {
                                    result.properties.remove(&entry.path);
                                }
                            }
                        }
                        return Some(result);
                    }
                }
            }
        }
    }
    
    // Fallback to committed state
    self.get_entity(character_id).cloned()
}
```

- [ ] **Step 3: Add IPC command parameter**

In `ipc.rs`:

```rust
#[tauri::command]
pub fn get_speculative_state(
    character_id: String,
    queue_id: Option<String>,  // NEW: optional queue_id
    engine: State<'_, Mutex<Engine>>,
) -> Option<Entity> {
    let engine = engine.lock().unwrap();
    engine.get_speculative_state(&character_id, queue_id.as_deref())
}
```

- [ ] **Step 4: Update frontend TypeScript**

In `src/lib/engine.ts`:

```typescript
export async function getSpeculativeState(
  characterId: string,
  queueId?: string
): Promise<Entity | null> {
  return invoke('get_speculative_state', { 
    characterId, 
    queueId: queueId ?? null 
  })
}
```

- [ ] **Step 5: Add unit tests**

```rust
#[test]
fn test_get_speculative_state_from_queue() {
    let mut engine = Engine::new();
    let char_id = engine.create_character("Thorin");
    
    // Create a pending queue with changes
    let queue_id = engine.queue_manager.create_child_queue(
        engine.queue_manager.get_root_queue_id().unwrap()
    ).unwrap();
    
    // Make changes in the queue
    {
        let queue = engine.queue_manager.get_queue_mut(&queue_id).unwrap();
        queue.take_snapshot(&engine.entities, engine.queue_manager.next_timestamp());
    }
    
    // Get speculative state
    let state = engine.get_speculative_state(&char_id, Some(&queue_id.to_string()));
    assert!(state.is_some());
}
```

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/engine.rs src-tauri/src/ipc.rs src/lib/engine.ts
git commit -m "feat(engine): get_speculative_state returns child queue state"
```

---

### Task C2: Workflow complete_when Evaluation

**Files:**
- Modify: `src-tauri/src/workflow.rs` (implement is_step_complete with actual condition evaluation)

**Context:** `WorkflowEngine::is_step_complete` (lines 101-108) always returns `true`. It needs to evaluate the `complete_when` condition from the workflow step definition.

**Implementation:**

- [ ] **Step 1: Implement is_step_complete with condition evaluation**

Replace the stub implementation in `workflow.rs`:

```rust
pub fn is_step_complete(
    &self,
    workflow_id: &str,
    step_id: &str,
    entity_state: &crate::entity::Entity,
) -> bool {
    let workflow = match self.workflows.get(workflow_id) {
        Some(w) => w,
        None => return false,
    };
    
    let step = match workflow.get_step(step_id) {
        Some(s) => s,
        None => return false,
    };
    
    // If step has no complete_when, check if it has a property set
    let condition = match &step.complete_when {
        Some(c) => c,
        None => {
            // Fallback: check if required property is set on entity
            return match step.command.as_str() {
                "select_race" => entity_state.get_property("race").is_some(),
                "select_class" => entity_state.get_property("class").is_some(),
                "assign_ability_scores" => entity_state.get_property("abilities.strength.score").is_some(),
                "allocate_skill_points" => entity_state.get_property("skill_points_allocated").is_some(),
                "select_feat" => entity_state.get_property("feats_selected").is_some(),
                _ => true,
            };
        }
    };
    
    // Evaluate complete_when conditions
    if let Some((path, expected_value)) = &condition.eq {
        let actual = entity_state.get_property(path)
            .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
            .unwrap_or(serde_json::Value::Null);
        return actual == *expected_value;
    }
    
    if let Some((path, min_value)) = &condition.gt {
        let actual = entity_state.get_property(path)
            .and_then(|v| v.as_int());
        if let (Some(a), serde_json::Value::Number(b)) = (actual, min_value) {
            return (a as f64) > b.as_f64().unwrap_or(0.0);
        }
        return false;
    }
    
    if let Some((path, max_value)) = &condition.lt {
        let actual = entity_state.get_property(path)
            .and_then(|v| v.as_int());
        if let (Some(a), serde_json::Value::Number(b)) = (actual, max_value) {
            return (a as f64) < b.as_f64().unwrap_or(0.0);
        }
        return false;
    }
    
    if let Some(path) = &condition.in_changeset {
        // This requires changeset access - handled separately
        // For now, check if property exists
        return entity_state.get_property(path).is_some();
    }
    
    true
}
```

- [ ] **Step 2: Add unit tests**

```rust
#[test]
fn test_is_step_complete_with_eq_condition() {
    let mut workflow_engine = WorkflowEngine::new();
    workflow_engine.register(create_character_creation_workflow());
    
    let mut entity = Entity {
        id: "char1".to_string(),
        entity_type: "character".to_string(),
        properties: HashMap::new(),
        tags: vec![],
        mdx_body: String::new(),
        source_pack: "test".to_string(),
        subscriptions: vec![],
        computed_views: vec![],
        prototype: None,
    };
    entity.set_property("race", Value::Str("human".to_string()));
    
    // select-race step complete_when: eq ["race", "human"] should be true
    let complete = workflow_engine.is_step_complete(
        "srd:workflow:character_creation",
        "select-race",
        &entity
    );
    assert!(complete);
}

#[test]
fn test_is_step_complete_unset_property() {
    let mut workflow_engine = WorkflowEngine::new();
    workflow_engine.register(create_character_creation_workflow());
    
    let entity = Entity {
        id: "char1".to_string(),
        entity_type: "character".to_string(),
        properties: HashMap::new(),
        tags: vec![],
        mdx_body: String::new(),
        source_pack: "test".to_string(),
        subscriptions: vec![],
        computed_views: vec![],
        prototype: None,
    };
    
    // select-race step should not be complete (race not set)
    let complete = workflow_engine.is_step_complete(
        "srd:workflow:character_creation",
        "select-race",
        &entity
    );
    assert!(!complete);
}
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/workflow.rs
git commit -m "feat(engine): evaluate complete_when conditions in is_step_complete"
```

---

### Task D1: Skill Allocation - Backend + IPC

**Files:**
- Modify: `src-tauri/src/engine.rs` (add allocate_skill_points method)
- Modify: `src-tauri/src/ipc.rs` (add allocate_skill_points command)

**Context:** Skill allocation is stubbed in the frontend with no backend support. Need to add the full stack.

**Data Model:**
- Character has: `skill_points_total`, `skill_points_remaining`, `skills` (map of skill_name -> ranks)
- Class entity has: `skillPoints` (per level), `classSkills` (list of cross-class vs class skills)
- Skill costs: class skill = 1 point per rank, cross-class = 2 points per rank
- Max ranks in a skill: character level (for class) or half that (for cross-class)

**Implementation:**

- [ ] **Step 1: Add allocate_skill_points to Engine**

```rust
pub fn allocate_skill_points(
    &mut self,
    character_id: &str,
    skill_allocations: HashMap<String, i64>, // skill_name -> ranks to add
) -> Result<(), String> {
    let character = self.entities.get_mut(character_id)
        .ok_or_else(|| "Character not found".to_string())?;
    
    // Get or initialize skill state
    let remaining = character.properties.get("skill_points_remaining")
        .and_then(|v| v.as_int())
        .unwrap_or(0);
    
    let class_id = character.properties.get("class")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "No class selected".to_string())?;
    
    let class_entity = self.entities.get(class_id)
        .ok_or_else(|| format!("Class not found: {}", class_id))?;
    
    let class_skills: Vec<String> = class_entity.properties.get("classSkills")
        .and_then(|v| v.as_list())
        .map(|list| list.iter.filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();
    
    let level = character.properties.get("level")
        .and_then(|v| v.as_int())
        .unwrap_or(1) as i64;
    
    let mut total_cost = 0i64;
    let mut new_ranks = HashMap::new();
    
    // Calculate total cost of allocations
    for (skill, ranks_to_add) in &skill_allocations {
        if *ranks_to_add <= 0 { continue; }
        
        let current_ranks = character.properties.get(&format!("skills.{}.ranks", skill))
            .and_then(|v| v.as_int())
            .unwrap_or(0);
        
        let is_class_skill = class_skills.iter().any(|cs| cs == skill);
        let cost_per_rank = if is_class_skill { 1 } else { 2 };
        
        // Validate max ranks
        let max_ranks = if is_class_skill { level } else { level / 2 };
        if current_ranks + ranks_to_add > max_ranks {
            return Err(format!(
                "Cannot add {} ranks to {} (max {} for {} skill at level {})",
                ranks_to_add, skill, max_ranks,
                if is_class_skill { "class" } else { "cross-class" },
                level
            ));
        }
        
        total_cost += ranks_to_add * cost_per_rank;
        new_ranks.insert(skill.clone(), current_ranks + ranks_to_add);
    }
    
    if total_cost > remaining {
        return Err(format!(
            "Not enough skill points (need {}, have {})",
            total_cost, remaining
        ));
    }
    
    // Apply allocations
    let new_remaining = remaining - total_cost;
    character.set_property("skill_points_remaining", Value::Int(new_remaining));
    
    for (skill, ranks) in &new_ranks {
        let path = format!("skills.{}.ranks", skill);
        character.set_property(&path, Value::Int(*ranks));
        
        // Calculate skill modifier: ranks + ability modifier
        let ability_key = skill_to_ability(skill);
        let ability_mod = character.properties
            .get(&format!("abilities.{}.modifier", ability_key))
            .and_then(|v| v.as_int())
            .unwrap_or(0);
        character.set_property(
            &format!("skills.{}.modifier", skill),
            Value::Int(ranks + ability_mod)
        );
    }
    
    Ok(())
}

// Helper: map skill name to relevant ability
fn skill_to_ability(skill: &str) -> String {
    match skill.to_lowercase().as_str() {
        "climb" | "jump" | "swim" => "strength".to_string(),
        "balance" | "dexterity" | "escape artist" | "hide" | "move silently" | 
        "open lock" | "ride" | "sleight of hand" | "stealth" | " tumble" => "dexterity".to_string(),
        "concentration" | "spellcraft" | "knowledge" | "profession" | "lucraft" | 
        "speak language" | "alchemy" => "intelligence".to_string(),
        "heal" | "insight" | "listen" | "sense motive" | "survival" => "wisdom".to_string(),
        "bluff" | "diplomacy" | "disguise" | "gather information" | "handle animal" |
        "intimidate" | "perform" | "use magic device" => "charisma".to_string(),
        _ => "dexterity".to_string(),
    }
}
```

- [ ] **Step 2: Add IPC command in ipc.rs**

```rust
#[tauri::command]
pub fn allocate_skill_points(
    character_id: String,
    allocations: HashMap<String, i64>,
    engine: State<'_, Mutex<Engine>>,
) -> Result<(), String> {
    let mut engine = engine.lock().unwrap();
    engine.allocate_skill_points(&character_id, allocations)
}
```

- [ ] **Step 3: Add to main.rs handler**

In `main.rs`, add `ipc::allocate_skill_points` to the invoke_handler.

- [ ] **Step 4: Add unit tests**

```rust
#[test]
fn test_allocate_skill_points_class_skill() {
    let mut engine = Engine::new();
    let char_id = engine.create_character("Thorin");
    
    // Setup: Human, Fighter level 1
    engine.select_race(&char_id, "srd:race:human").unwrap();
    engine.select_class(&char_id, "srd:class:fighter", 1).unwrap();
    
    // Allocate 2 ranks to Climb (Fighter class skill)
    let mut allocations = HashMap::new();
    allocations.insert("Climb".to_string(), 2);
    
    engine.allocate_skill_points(&char_id, allocations).unwrap();
    
    let character = engine.get_entity(&char_id).unwrap();
    assert_eq!(
        character.get_property("skills.Climb.ranks"),
        Some(&Value::Int(2))
    );
    // 2 (ranks) + str modifier
    assert!(character.get_property("skills.Climb.modifier").is_some());
}
```

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/engine.rs src-tauri/src/ipc.rs src-tauri/src/main.rs
git commit -m "feat(engine): implement skill point allocation with cost validation"
```

---

### Task D2: Skill Allocation - Frontend Integration

**Files:**
- Modify: `src/routes/CreationWizard.tsx` (implement skill allocation UI step)
- Modify: `src/lib/engine.ts` (add allocateSkillPoints wrapper)

**Context:** The skill step currently shows "Skill allocation coming soon." with a skip button. Replace with actual skill allocation UI.

**Implementation:**

- [ ] **Step 1: Add frontend engine wrapper**

In `src/lib/engine.ts`:

```typescript
export async function allocateSkillPoints(
  characterId: string,
  allocations: Record<string, number>
): Promise<void> {
  return invoke('allocate_skill_points', { characterId, allocations })
}
```

- [ ] **Step 2: Implement skill allocation UI in CreationWizard**

Replace the skills case in `renderStep()`:

```tsx
case 'skills': {
  const [availablePoints, setAvailablePoints] = useState(0)
  const [allocatedPoints, setAllocatedPoints] = useState<Record<string, number>>({})
  
  useEffect(() => {
    // Load skill points from character entity
    const loadSkillPoints = async () => {
      const entity = await getEntityById(characterId!)
      if (entity) {
        const remaining = entity.properties['skill_points_remaining'] as number ?? 0
        setAvailablePoints(remaining)
        
        // Load existing allocations
        const allocated = entity.properties['skills'] as Record<string, {ranks: number}> ?? {}
        const points: Record<string, number> = {}
        for (const [skill, data] of Object.entries(allocated)) {
          if (typeof data === 'object' && 'ranks' in data) {
            points[skill] = (data as {ranks: number}).ranks
          }
        }
        setAllocatedPoints(points)
      }
    }
    loadSkillPoints()
  }, [characterId])
  
  // Get available skills from class entity
  const skills = [
    'Climb', 'Craft', 'Handle Animal', 'Intimidate', 'Jump', 
    'Knowledge(Dungeoneering)', 'Ride', 'Swim'
    // Would be populated from class's classSkills property
  ]
  
  const handleAllocate = async (skill: string, delta: number) => {
    const newAllocated = { ...allocatedPoints, [skill]: (allocatedPoints[skill] || 0) + delta }
    setAllocatedPoints(newAllocated)
    setAvailablePoints(prev => prev - delta)
    
    // Sync to backend
    await allocateSkillPoints(characterId!, { [skill]: delta })
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Allocate Skill Points</h2>
      <p className="text-gray-600">
        Available Points: <strong>{availablePoints}</strong>
      </p>
      
      <div className="space-y-2">
        {skills.map(skill => (
          <div key={skill} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="font-medium">{skill}</span>
            <div className="flex items-center gap-2">
              <span>{allocatedPoints[skill] || 0} ranks</span>
              <button
                onClick={() => handleAllocate(skill, 1)}
                disabled={availablePoints <= 0}
                className="px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                +
              </button>
              <button
                onClick={() => handleAllocate(skill, -1)}
                disabled={!allocatedPoints[skill]}
                className="px-2 py-1 bg-gray-400 text-white rounded disabled:opacity-50"
              >
                -
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex gap-4">
        <button onClick={() => setStep('abilities')} className="px-6 py-2 border rounded-lg">
          Back
        </button>
        <button
          onClick={() => setStep('feats')}
          disabled={availablePoints > 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Test manually via Tauri MCP**

Create a character, go through race/class/abilities, then skill step. Allocate points and verify they persist.

---

### Task D3: Feat Selection - Backend + IPC

**Files:**
- Modify: `src-tauri/src/engine.rs` (add select_feat method)
- Modify: `src-tauri/src/ipc.rs` (add select_feat command)

**Context:** Similar to skill allocation, feat selection is stubbed.

**Data Model:**
- Character has: `feat_slots` (available feat slots), `feats` (list of selected feats)
- Feat entity has: `prerequisites` (optional), `bonusesFor` (optional, for bonus feats)

**Implementation:**

- [ ] **Step 1: Add select_feat to Engine**

```rust
pub fn select_feat(
    &mut self,
    character_id: &str,
    feat_id: &str,
) -> Result<(), String> {
    let character = self.entities.get_mut(character_id)
        .ok_or_else(|| "Character not found".to_string())?;
    
    let feat = self.entities.get(feat_id)
        .ok_or_else(|| format!("Feat not found: {}", feat_id))?;
    
    // Check prerequisites
    if let Some(prereqs) = feat.properties.get("prerequisites") {
        // Would evaluate prerequisites against character state
        // For now, skip prerequisite checking (can add later)
    }
    
    // Check if character has available feat slots
    let slots_available = character.properties.get("feat_slots_remaining")
        .and_then(|v| v.as_int())
        .unwrap_or(0);
    
    if slots_available <= 0 {
        return Err("No feat slots remaining".to_string());
    }
    
    // Add feat to character's feats list
    let feats_path = "feats_selected";
    let mut feats_list: Vec<Value> = character.properties.get(feats_path)
        .and_then(|v| v.as_list())
        .cloned()
        .unwrap_or_default();
    
    feats_list.push(Value::Str(feat_id.to_string()));
    character.set_property(feats_path, Value::List(feats_list));
    
    // Consume a feat slot
    character.set_property("feat_slots_remaining", Value::Int(slots_available - 1));
    
    // Install feat's subscriptions onto character
    if let Some(subs) = feat.properties.get("subscriptions") {
        // Parse and add subscriptions from feat
    }
    
    Ok(())
}
```

- [ ] **Step 2: Add IPC command**

```rust
#[tauri::command]
pub fn select_feat(
    character_id: String,
    feat_id: String,
    engine: State<'_, Mutex<Engine>>,
) -> Result<(), String> {
    let mut engine = engine.lock().unwrap();
    engine.select_feat(&character_id, &feat_id)
}
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/engine.rs src-tauri/src/ipc.rs
git commit -m "feat(engine): implement feat selection"
```

---

### Task D4: Feat Selection - Frontend Integration

**Files:**
- Modify: `src/routes/CreationWizard.tsx` (implement feat selection UI step)
- Modify: `src/lib/engine.ts` (add selectFeat wrapper)

**Implementation:**

- [ ] **Step 1: Add frontend wrapper**

```typescript
export async function selectFeat(characterId: string, featId: string): Promise<void> {
  return invoke('select_feat', { characterId, featId })
}

export async function getFeats(characterId: string): Promise<Entity[]> {
  return getAvailableChoices(characterId, 'feat')
}
```

- [ ] **Step 2: Implement feat selection UI**

Replace the feats case in `renderStep()`:

```tsx
case 'feats': {
  const [selectedFeats, setSelectedFeats] = useState<string[]>([])
  const [availableFeats, setAvailableFeats] = useState<Entity[]>([])
  const [slotsRemaining, setSlotsRemaining] = useState(0)
  
  useEffect(() => {
    const loadFeats = async () => {
      const feats = await getFeats(characterId!)
      setAvailableFeats(feats)
      
      const entity = await getEntityById(characterId!)
      if (entity) {
        const slots = entity.properties['feat_slots_remaining'] as number ?? 1
        setSlotsRemaining(slots)
        
        const selected = entity.properties['feats_selected'] as string[] ?? []
        setSelectedFeats(selected)
      }
    }
    loadFeats()
  }, [characterId])
  
  const handleSelectFeat = async (feat: Entity) => {
    if (slotsRemaining <= 0) return
    if (selectedFeats.includes(feat.id)) return
    
    await selectFeat(characterId!, feat.id)
    setSelectedFeats(prev => [...prev, feat.id])
    setSlotsRemaining(prev => prev - 1)
  }
  
  const selectedFeatNames = selectedFeats.map(id => 
    availableFeats.find(f => f.id === id)?.properties['name'] ?? id
  )
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Select Feats</h2>
      <p className="text-gray-600">
        Feat Slots Remaining: <strong>{slotsRemaining}</strong>
      </p>
      
      {selectedFeats.length > 0 && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">Selected Feats:</h3>
          <ul className="list-disc list-inside">
            {selectedFeatNames.map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {availableFeats.map(feat => (
          <button
            key={feat.id}
            onClick={() => handleSelectFeat(feat)}
            disabled={slotsRemaining <= 0 || selectedFeats.includes(feat.id)}
            className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left disabled:opacity-50 disabled:hover:border-inherit"
          >
            <h3 className="font-bold">
              {getPropertyString(feat.properties, 'name', feat.id)}
            </h3>
          </button>
        ))}
      </div>
      
      <div className="flex gap-4">
        <button onClick={() => setStep('skills')} className="px-6 py-2 border rounded-lg">
          Back
        </button>
        <button
          onClick={() => setStep('review')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          Continue to Review
        </button>
      </div>
    </div>
  )
}
```

---

## Test Summary

### Unit Tests to Add

| Module | Test | File |
|--------|------|------|
| dispatch | test_stack_rule_highest_wins | dispatch.rs |
| dispatch | test_stack_rule_additive | dispatch.rs |
| dispatch | test_computed_view_evaluates_on_input_change | dispatch.rs |
| dispatch | test_entity_direct_subscriptions_fire | dispatch.rs |
| engine | test_allocate_skill_points_class_skill | engine.rs |
| engine | test_get_speculative_state_from_queue | engine.rs |
| workflow | test_is_step_complete_with_eq_condition | workflow.rs |
| workflow | test_is_step_complete_unset_property | workflow.rs |

### Integration Tests (Frontend)

| Test | File |
|------|------|
| allocateSkillPoints calls correct IPC | src/lib/__tests__/engine.test.ts |
| selectFeat calls correct IPC | src/lib/__tests__/engine.test.ts |

### Manual Testing via Tauri MCP

After each feature is implemented, test via Tauri MCP:

```bash
# Skill allocation
npx tauri mcp invoke allocate_skill_points '{"character_id": "...", "allocations": {"Climb": 2}}'

# Feat selection
npx tauri mcp invoke select_feat '{"character_id": "...", "feat_id": "srd:feat:power-attack"}'

# Speculative state
npx tauri mcp invoke get_speculative_state '{"character_id": "...", "queue_id": "..."}'

# Workflow status
npx tauri mcp invoke get_workflow_status '{"character_id": "...", "workflow_id": "srd:workflow:character_creation"}'
```

---

## Dependencies Summary

```
A1: CharacterSheet fix              [NO DEPS] - parallel execution
A2: Stack rules application          [NO DEPS] - parallel execution

B1: Computed view evaluation         [A2] - dispatcher modification
B2: Entity subscriptions            [A2] - dispatcher modification

C1: Speculative execution            [A2] - queue manager access
C2: Workflow complete_when           [A2] - workflow engine modification

D1: Skill allocation backend         [B1] - computed views for skill modifiers
D2: Skill allocation frontend        [D1] - depends on backend
D3: Feat selection backend           [D1] - similar pattern
D4: Feat selection frontend          [D3] - depends on backend
```

**Execution Recommendation:** 
- Group A (A1, A2) in parallel first
- Groups B and C in parallel after A2
- Group D sequential after B and C complete

