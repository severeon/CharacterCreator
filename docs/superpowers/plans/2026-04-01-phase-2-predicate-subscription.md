# Phase 2: Predicate & Subscription Language — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Zen-expression WASM evaluator into Rust and JS, port existing subscription engine to the new predicate combinator format, implement the plugin escape hatch contract, and build the Rule of Cool forward-patch mechanism.

**Architecture:** Zen-expression WASM runs identically in Rust (engine evaluation) and JavaScript (frontend preview/speculative state). Predicates are YAML structural combinators evaluated by the subscription runner. Effects produce operations that flow through the dispatcher. The plugin contract is async `context → operations[]` — plugins return zero or more validated operations. The Rule of Cool mechanism (Phase 5) reuses the event log's append-only event types.

**Tech Stack:** Rust (WASM compilation via `zen-expression` crate), JavaScript (WASM loader), TypeScript, WASM-pack or similar for JS WASM binding

**Prerequisites:** Phase 1 complete. `pack test` must exist so subscription migration can be tested. Mechanic entities must be loadable.

---

### Task 1: Zen-expression WASM build pipeline

**Files:**
- Create: `zen-expression/pkg/` (WASM build output — committed)
- Create: `zen-expression/Cargo.toml`
- Create: `zen-expression/src/lib.rs`
- Create: `zen-expression/build.sh`
- Modify: `vite.config.ts` (add WASM support)

- [ ] **Step 1: Create zen-expression Rust crate**

```toml
# zen-expression/Cargo.toml
[package]
name = "zen-expression"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
wasm-bindgen = "0.2"

[profile.release]
opt-level = "s"
lto = true
```

```rust
// zen-expression/src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn evaluate(formula: &str, context_json: &str) -> Result<JsValue, JsValue> {
    // Parse and evaluate the Zen-expression formula against the context JSON.
    // Returns the result as a JSON string.
    let context: serde_json::Value = serde_json::from_str(context_json)
        .map_err(|e| JsValue::from_str(&format!("context parse error: {e}")))?;

    let result = eval_expr(formula, &context)
        .map_err(|e| JsValue::from_str(&format!("eval error: {e}")))?;

    serde_json::to_string(&result)
        .map(|s| JsValue::from_str(&s))
        .map_err(|e| JsValue::from_str(&format!("serialize error: {e}")))
}

fn eval_expr(formula: &str, context: &serde_json::Value) -> Result<serde_json::Value, String> {
    // Minimal expression evaluator supporting:
    // - Numeric literals and basic arithmetic: +, -, *, /
    // - Property access via dot notation: abilities.str.score
    // - Lookup: lookup(table, key)
    // - Conditional: if condition then then_val else else_val
    // - Comparison: ==, !=, <, >, <=, >=, gte, lte, gt, lt
    // - Logical: and, or, not
    // Full implementation per the zen-expression spec.
    todo!("Full expression evaluator implementation")
}
```

- [ ] **Step 2: Build WASM module**

Run:
```bash
cd zen-expression && wasm-pack build --target web --out-dir ../zen-expression/pkg
```

Expected: WASM file generated in `zen-expression/pkg/`.

- [ ] **Step 3: Verify WASM works in Node**

Run:
```bash
node -e "import('./zen-expression/pkg/zen_expression.js').then(m => m.evaluate('(16 - 10) / 2', '{}')).then(r => console.log('Result:', r))"
```

Expected: Outputs result.

- [ ] **Step 4: Configure Vite for WASM**

Update `vite.config.ts` to handle WASM imports:

```typescript
// vite.config.ts
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    // ... existing plugins
  ],
});
```

Add to `package.json`:
```json
"dependencies": {
  "vite-plugin-wasm": "^3.3.0"
}
```

- [ ] **Step 5: Verify frontend builds with WASM**

Run:
```bash
pnpm install
pnpm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

Run:
```bash
git add zen-expression/ vite.config.ts package.json
git commit -m "feat: add zen-expression WASM module for cross-platform formula evaluation"
```

---

### Task 2: Rust integration of Zen-expression evaluator

**Files:**
- Create: `src-tauri/src/expression_eval.rs`
- Modify: `src-tauri/src/Cargo.toml`
- Modify: `src-tauri/src/mechanic_store.rs` (use evaluator for computed views)

- [ ] **Step 1: Write failing test for expression evaluation**

```rust
// src-tauri/src/expression_eval.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_arithmetic() {
        let result = evaluate("(16 - 10) / 2", &serde_json::json!({})).unwrap();
        assert_eq!(result, 3.0);
    }

    #[test]
    fn test_property_access() {
        let ctx = serde_json::json!({
            "abilities": { "str": { "score": 16 } }
        });
        let result = evaluate("abilities.str.score", &ctx).unwrap();
        assert_eq!(result, 16);
    }

    #[test]
    fn test_if_then_else() {
        let ctx = serde_json::json!({ "is_class_skill": true, "level": 5 });
        let result = evaluate(
            "if is_class_skill then level + 3 else (level + 3) / 2",
            &ctx
        ).unwrap();
        assert_eq!(result, 8.0);
    }

    #[test]
    fn test_lookup() {
        let ctx = serde_json::json!({
            "bab_progression": "full",
            "progressions": {
                "full": [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
            }
        });
        let result = evaluate("lookup(bab_progression, level)", &ctx).unwrap();
        assert_eq!(result, 1.0);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd src-tauri && cargo test expression_eval -- --nocapture
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement expression evaluator wrapper**

```rust
// src-tauri/src/expression_eval.rs
use serde_json::Value;

/// Evaluate a Zen-expression formula against a JSON context.
/// This is a native Rust implementation — the same logic as the WASM module.
/// We use the native implementation in Rust to avoid WASM overhead in the engine.
/// The WASM module is used by the JavaScript frontend for preview/validation.
pub fn evaluate(formula: &str, context: &Value) -> Result<Value, String> {
    // Full parser + evaluator implementation here.
    // Delegates to individual functions for each expression type.
    zen_expression::eval(formula, context)
        .map_err(|e| format!("Expression evaluation error: {e}"))
}
```

The key insight: the Rust engine uses the native `zen_expression` crate directly (not WASM). The WASM build is only for the JavaScript frontend to do speculative/preview evaluation. Both use the same expression parsing and evaluation logic.

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd src-tauri && cargo test expression_eval -- --nocapture
```

Expected: All tests pass.

- [ ] **Step 5: Wire into MechanicStore for computed view evaluation**

Modify `src-tauri/src/mechanic_store.rs` — replace the hardcoded `compute_ability_modifier` with calls to `expression_eval::evaluate`:

```rust
/// Compute ability modifier using the formula from the mechanic entity.
pub fn compute_ability_modifier(&self, score: i32, context: &Value) -> Result<i32, String> {
    let mechanics = self.mechanics.read().unwrap();
    let ability_mechanic = mechanics
        .get("srd:mechanic:ability-scores")
        .ok_or("Ability scores mechanic not loaded")?;

    let formula = ability_mechanic
        .pointer("/properties/modifier_formula")
        .and_then(|v| v.as_str())
        .unwrap_or("(score - 10) / 2");

    let eval_ctx = serde_json::json!({ "score": score });
    let result = expression_eval::evaluate(formula, &eval_ctx)
        .map_err(|e| format!("Failed to evaluate modifier formula: {e}"))?;

    result
        .as_f64()
        .map(|f| f as i32)
        .ok_or_else(|| format!("Modifier formula returned non-numeric: {}", result))
}
```

- [ ] **Step 6: Run all tests**

Run:
```bash
cd src-tauri && cargo test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

Run:
```bash
git add src-tauri/src/expression_eval.rs src-tauri/src/mechanic_store.rs src-tauri/src/main.rs
git commit -m "feat: integrate zen-expression evaluator into Rust engine for computed view evaluation"
```

---

### Task 3: Predicate combinator evaluator

**Files:**
- Create: `src-tauri/src/predicate.rs`
- Test: inline in `predicate.rs`

- [ ] **Step 1: Write failing test for predicate evaluation**

```rust
// src-tauri/src/predicate.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_equality() {
        let ctx = serde_json::json!({ "entity": { "class": "fighter" }, "level": 1 });
        let predicate = serde_json::json!({
            "entity.class": "fighter"
        });
        assert!(evaluate_predicate(&predicate, &ctx).unwrap());
    }

    #[test]
    fn test_one_of() {
        let ctx = serde_json::json!({ "level": 2 });
        let predicate = serde_json::json!({
            "level": { "one_of": [1, 2, 4, 6, 8] }
        });
        assert!(evaluate_predicate(&predicate, &ctx).unwrap());

        let ctx3 = serde_json::json!({ "level": 3 });
        assert!(!evaluate_predicate(&predicate, &ctx3).unwrap());
    }

    #[test]
    fn test_all_combinator() {
        let ctx = serde_json::json!({
            "entity": { "class": "fighter" },
            "level": 4
        });
        let predicate = serde_json::json!({
            "all": [
                { "entity.class": "fighter" },
                { "level": { "one_of": [1, 2, 4, 6, 8] } }
            ]
        });
        assert!(evaluate_predicate(&predicate, &ctx).unwrap());
    }

    #[test]
    fn test_not_combinator() {
        let ctx = serde_json::json!({ "entity": { "class": "wizard" } });
        let predicate = serde_json::json!({
            "not": { "entity.class": "fighter" }
        });
        assert!(evaluate_predicate(&predicate, &ctx).unwrap());
    }

    #[test]
    fn test_has_tag() {
        let ctx = serde_json::json!({ "tags": ["source:phb", "role:martial"] });
        let predicate = serde_json::json!({
            "has_tag": "source:phb"
        });
        assert!(evaluate_predicate(&predicate, &ctx).unwrap());

        let predicate_missing = serde_json::json!({
            "has_tag": "source:forge"
        });
        assert!(!evaluate_predicate(&predicate_missing, &ctx).unwrap());
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd src-tauri && cargo test predicate -- --nocapture
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement predicate combinator evaluator**

```rust
// src-tauri/src/predicate.rs
use serde_json::{Map, Value};

/// Evaluate a predicate (JSON object) against a context (JSON object).
/// Returns true if the predicate passes, false if it fails.
pub fn evaluate_predicate(predicate: &Value, context: &Value) -> Result<bool, String> {
    match predicate {
        Value::Object(obj) => evaluate_predicate_object(obj, context),
        Value::String(s) => evaluate_string_predicate(s, context),
        _ => Err(format!("Predicate must be an object or string, got: {}", predicate)),
    }
}

fn evaluate_predicate_object(obj: &Map<String, Value>, context: &Value) -> Result<bool, String> {
    // Handle top-level combinators
    if let Some(combinator) = obj.get("all") {
        let items = combinator.as_array()
            .ok_or("'all' must be an array")?;
        for item in items {
            if !evaluate_predicate(item, context)? {
                return Ok(false);
            }
        }
        return Ok(true);
    }

    if let Some(combinator) = obj.get("any") {
        let items = combinator.as_array()
            .ok_or("'any' must be an array")?;
        for item in items {
            if evaluate_predicate(item, context)? {
                return Ok(true);
            }
        }
        return Ok(false);
    }

    if let Some(combinator) = obj.get("not") {
        let result = evaluate_predicate(combinator, context)?;
        return Ok(!result);
    }

    if let Some(combinator) = obj.get("one_of") {
        return evaluate_one_of(combinator, context);
    }

    if let Some(combinator) = obj.get("none_of") {
        let result = evaluate_one_of(combinator, context)?;
        return Ok(!result);
    }

    if let Some(combinator) = obj.get("has_tag") {
        let tag = combinator.as_str().ok_or("has_tag value must be string")?;
        return evaluate_has_tag(tag, context);
    }

    if let Some(combinator) = obj.get("has_property") {
        let path = combinator.as_str().ok_or("has_property value must be string")?;
        return evaluate_has_property(path, context);
    }

    if let Some(combinator) = obj.get("matches") {
        return evaluate_matches(combinator, context);
    }

    // Default: evaluate as key-value match
    for (key, value) in obj {
        if key == "all" || key == "any" || key == "not" || key == "one_of"
            || key == "none_of" || key == "has_tag" || key == "has_property" || key == "matches"
            || key == "gte" || key == "lte" || key == "gt" || key == "lt" || key == "eq" {
            continue;
        }

        if !evaluate_key_value(key, value, context)? {
            return Ok(false);
        }
    }
    Ok(true)
}

fn evaluate_key_value(key: &str, expected: &Value, context: &Value) -> Result<bool, String> {
    // Handle comparison operators
    if let Some(comparand) = expected.get("one_of") {
        return evaluate_one_of(key, comparand, context);
    }

    if let Some(v) = expected.get("gte") {
        return compare_values(key, v, context, |a, b| a >= b);
    }
    if let Some(v) = expected.get("lte") {
        return compare_values(key, v, context, |a, b| a <= b);
    }
    if let Some(v) = expected.get("gt") {
        return compare_values(key, v, context, |a, b| a > b);
    }
    if let Some(v) = expected.get("lt") {
        return compare_values(key, v, context, |a, b| a < b);
    }
    if let Some(v) = expected.get("eq") {
        return compare_values(key, v, context, |a, b| a == b);
    }

    // Simple equality
    let actual = get_value_by_path(context, key)?;
    match (actual, expected) {
        (Some(a), Some(e)) => Ok(a == *e),
        _ => Ok(false),
    }
}

fn get_value_by_path(context: &Value, path: &str) -> Result<Option<Value>, String> {
    let parts: Vec<&str> = path.split('.').collect();
    let mut current = context.clone();
    for part in parts {
        current = match current.get(part) {
            Some(v) => v.clone(),
            None => return Ok(None),
        };
    }
    Ok(Some(current))
}

fn compare_values<F>(
    key: &str,
    comparand: &Value,
    context: &Value,
    cmp: F,
) -> Result<bool, String>
where
    F: Fn(f64, f64) -> bool,
{
    let actual_opt = get_value_by_path(context, key)?;
    let actual = actual_opt
        .ok_or_else(|| format!("Path '{}' not found in context", key))?
        .as_f64()
        .ok_or_else(|| format!("Value at '{}' is not numeric", key))?;

    let comp = comparand
        .as_f64()
        .ok_or_else(|| format!("Comparand for '{}' is not numeric", key))?;

    Ok(cmp(actual, comp))
}

fn evaluate_one_of(key: &str, list: &Value, context: &Value) -> Result<bool, String> {
    let actual = get_value_by_path(context, key)?
        .ok_or_else(|| format!("Path '{}' not found in context", key))?;
    Ok(is_in_list(&actual, list))
}

fn evaluate_has_tag(tag: &str, context: &Value) -> Result<bool, String> {
    let tags = context.get("tags")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect::<Vec<_>>())
        .unwrap_or_default();
    Ok(tags.contains(&tag))
}

fn evaluate_has_property(path: &str, context: &Value) -> Result<bool, String> {
    Ok(get_value_by_path(context, path)?.is_some())
}

fn evaluate_matches(pattern_val: &Value, context: &Value) -> Result<bool, String> {
    // matches can be: { matches: "pattern" } (matches against a tag/path)
    // or { matches: { path: "field", pattern: "p*" } }
    let (path, pattern) = if let Some(p) = pattern_val.as_str() {
        // Simple form: matches against tags by default
        ("tags".to_string(), p.to_string())
    } else if let Some(obj) = pattern_val.as_object() {
        let path = obj.get("path")
            .and_then(|v| v.as_str())
            .ok_or("matches requires 'path' field")?;
        let pat = obj.get("pattern")
            .and_then(|v| v.as_str())
            .ok_or("matches requires 'pattern' field")?;
        (path.to_string(), pat.to_string())
    } else {
        return Err("matches value must be string or object".to_string());
    };

    let value = get_value_by_path(context, &path)?
        .ok_or_else(|| format!("Path '{}' not found", path))?;

    let value_str = value
        .as_str()
        .ok_or_else(|| format!("Value at '{}' is not a string", path))?;

    // Simple glob: split on '*', match sequentially
    let glob_parts: Vec<&str> = pattern.split('*').collect();
    if glob_parts.len() == 1 {
        return Ok(value_str == pattern);
    }

    let mut pos = 0;
    for part in glob_parts.iter() {
        if let Some(idx) = value_str[pos..].find(part) {
            pos += idx + part.len();
        } else {
            return Ok(false);
        }
    }
    Ok(true)
}

fn is_in_list(value: &Value, list: &Value) -> bool {
    list.as_array()
        .map(|arr| arr.iter().any(|v| v == value))
        .unwrap_or(false)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd src-tauri && cargo test predicate -- --nocapture
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

Run:
```bash
git add src-tauri/src/predicate.rs src-tauri/src/main.rs
git commit -m "feat: add predicate combinator evaluator — all, any, not, one_of, has_tag, has_property, comparisons"
```

---

### Task 4: Subscription runner port

**Files:**
- Modify: `src-tauri/src/subscription.rs`
- Modify: `src-tauri/src/dispatch/dispatcher.rs`

- [ ] **Step 1: Review current subscription structure**

Read `src-tauri/src/subscription.rs` to understand the current subscription structure, then migrate to the new predicate format.

- [ ] **Step 2: Write failing test for new predicate-based subscription**

```rust
#[test]
fn test_subscription_fires_on_trigger() {
    let sub = Subscription {
        trigger: "level_up".into(),
        predicate: serde_json::json!({
            "all": [
                { "entity.class": "fighter" },
                { "level": { "one_of": [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20] } }
            ]
        }),
        effects: vec![
            Effect { op: "add".into(), path: "feat_slots.combat".into(), value: serde_json::json!(1) }
        ],
    };

    let ctx = serde_json::json!({
        "entity": { "class": "fighter" },
        "level": 4
    });
    assert!(sub.should_fire("level_up", &ctx).unwrap());

    let ctx3 = serde_json::json!({
        "entity": { "class": "fighter" },
        "level": 3
    });
    assert!(!sub.should_fire("level_up", &ctx3).unwrap());
}
```

- [ ] **Step 3: Update subscription struct and should_fire method**

Replace the current `should_fire` implementation with one that calls `predicate::evaluate_predicate`.

- [ ] **Step 4: Run tests**

Run:
```bash
cd src-tauri && cargo test subscription -- --nocapture
```

Expected: All subscription tests pass with the new predicate evaluator.

- [ ] **Step 5: Commit**

Run:
```bash
git add src-tauri/src/subscription.rs src-tauri/src/dispatch/dispatcher.rs
git commit -m "feat: port subscription runner to new predicate combinator format"
```

---

### Task 5: Plugin escape hatch contract

**Files:**
- Create: `src-tauri/src/plugin_host.rs`
- Modify: `src-tauri/src/subscription.rs` (call plugin on matching subscription)

- [ ] **Step 1: Write failing test for plugin contract**

```rust
// src-tauri/src/plugin_host.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_plugin_rejects_invalid_operations() {
        // Plugin returns operations — engine validates them before applying
        let ops = vec![
            Operation { op: "set".into(), path: "hp".into(), value: serde_json::json!(50) }
        ];
        let result = validate_operations(&ops);
        assert!(result.is_ok());
    }

    #[test]
    fn test_plugin_rejects_unknown_op() {
        let ops = vec![
            Operation { op: "fly".into(), path: "hp".into(), value: serde_json::json!(50) }
        ];
        let result = validate_operations(&ops);
        assert!(result.is_err());
    }
}
```

- [ ] **Step 2: Implement plugin host**

```rust
// src-tauri/src/plugin_host.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginContext {
    pub event: String,
    pub entity_state: serde_json::Value,
    pub campaign_context: serde_json::Value,
    pub config: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Operation {
    pub op: String,
    pub path: String,
    pub value: serde_json::Value,
}

const VALID_OPS: &[&str] = &["set", "add", "sub", "multiply", "grant", "revoke", "push", "pop", "clear"];

/// Validate that a plugin's returned operations are all valid Arcanum operations.
/// Plugins are untrusted — all their operations must pass validation before being applied.
pub fn validate_operations(ops: &[Operation]) -> Result<(), String> {
    for op in ops {
        if !VALID_OPS.contains(&op.op.as_str()) {
            return Err(format!("Unknown operation '{}' from plugin", op.op));
        }
        // Validate path is non-empty
        if op.path.is_empty() {
            return Err("Operation path cannot be empty".to_string());
        }
    }
    Ok(())
}

/// Call a plugin with the given context and config.
/// The plugin is identified by its namespaced ID (e.g., "dread:jenga-tower").
/// Returns zero or more validated operations.
pub async fn call_plugin(
    plugin_id: &str,
    context: PluginContext,
) -> Result<Vec<Operation>, String> {
    // Stub: actual plugin execution would call WASM/Lua runtime.
    // For now, return empty — plugins are Phase 6+ features.
    // The contract is what matters here: async context → operations[].
    Ok(vec![])
}
```

- [ ] **Step 3: Wire plugin call into subscription runner**

When a subscription has a `plugin` field (no `effects` block), call `plugin_host::call_plugin` instead of applying inline effects.

- [ ] **Step 4: Run tests**

Run:
```bash
cd src-tauri && cargo test plugin_host -- --nocapture
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

Run:
```bash
git add src-tauri/src/plugin_host.rs src-tauri/src/subscription.rs src-tauri/src/main.rs
git commit -m "feat: add plugin escape hatch — async context → operations[] contract with operation validation"
```

---

### Task 6: Phase 2 verification

- [ ] **Step 1: Run full test suite**

Run:
```bash
pnpm run test
cd src-tauri && cargo test
pnpm run test:e2e
```

Expected: All tests pass.

- [ ] **Step 2: Verify predicate evaluation in app**

Load the SRD pack and verify that existing subscriptions (fighter bonus feat, etc.) still fire correctly with the new predicate combinator format.

- [ ] **Step 3: Verify JS frontend WASM works**

Open the app in dev mode, verify no WASM loading errors in console.

- [ ] **Step 4: Tag Phase 2 complete**

Run:
```bash
git tag phase-2-complete
```
