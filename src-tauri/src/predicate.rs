// Pre-wiring infrastructure: fully tested, not yet called from IPC layer.
// Will be wired to the dispatch system in a future phase.
#![allow(dead_code)]

/// JSON-combinator predicate evaluator.
///
/// Predicates are `serde_json::Value` objects (loaded from YAML subscription
/// definitions) evaluated against a JSON context.
///
/// Supported forms:
/// - Simple equality:   `{"entity.class": "fighter"}`
/// - one_of:            `{"level": {"one_of": [1, 2, 4]}}`
/// - all:               `{"all": [...predicates...]}`
/// - any:               `{"any": [...predicates...]}`
/// - not:               `{"not": {...predicate...}}`
/// - none_of:           `{"level": {"none_of": [3, 5]}}`
/// - has_tag:           `{"has_tag": "source:phb"}`
/// - has_property:      `{"has_property": "abilities.str.score"}`
/// - matches:           `{"matches": "source:*"}` (glob against tags array)
/// - comparisons:       `{"level": {"gte": 3}}`, `{"level": {"lte": 20}}`,
///                      `{"level": {"gt": 2}}`,  `{"level": {"lt": 5}}`

use serde_json::Value;

/// Evaluate a predicate against a context.
///
/// Returns `Ok(true)` / `Ok(false)`, or `Err(String)` if the predicate is
/// structurally invalid.
pub fn evaluate_predicate(pred: &Value, ctx: &Value) -> Result<bool, String> {
    match pred {
        Value::Object(map) => {
            // --- combinators that stand alone as the only key ---
            if let Some(sub) = map.get("all") {
                let arr = sub
                    .as_array()
                    .ok_or("'all' requires an array")?;
                for item in arr {
                    if !evaluate_predicate(item, ctx)? {
                        return Ok(false);
                    }
                }
                return Ok(true);
            }

            if let Some(sub) = map.get("any") {
                let arr = sub
                    .as_array()
                    .ok_or("'any' requires an array")?;
                for item in arr {
                    if evaluate_predicate(item, ctx)? {
                        return Ok(true);
                    }
                }
                return Ok(false);
            }

            if let Some(sub) = map.get("not") {
                return Ok(!evaluate_predicate(sub, ctx)?);
            }

            if let Some(tag_val) = map.get("has_tag") {
                let tag = tag_val
                    .as_str()
                    .ok_or("'has_tag' requires a string value")?;
                return Ok(ctx_has_tag(ctx, tag));
            }

            if let Some(prop_val) = map.get("has_property") {
                let path = prop_val
                    .as_str()
                    .ok_or("'has_property' requires a string path")?;
                return Ok(get_path(ctx, path).is_some());
            }

            if let Some(glob_val) = map.get("matches") {
                let pattern = glob_val
                    .as_str()
                    .ok_or("'matches' requires a string glob pattern")?;
                return Ok(ctx_matches_glob(ctx, pattern));
            }

            // --- field-level predicates: {"dot.path": <operator-or-value>} ---
            // Iterate all keys; each key is a dot-path into ctx, value is
            // either a literal (equality) or an operator object.
            for (key, op) in map {
                let field_val = get_path(ctx, key);

                match op {
                    Value::Object(op_map) => {
                        let val = field_val.unwrap_or(&Value::Null);
                        if let Some(list) = op_map.get("one_of") {
                            let arr = list
                                .as_array()
                                .ok_or("'one_of' requires an array")?;
                            if !arr.contains(val) {
                                return Ok(false);
                            }
                        } else if let Some(list) = op_map.get("none_of") {
                            let arr = list
                                .as_array()
                                .ok_or("'none_of' requires an array")?;
                            if arr.contains(val) {
                                return Ok(false);
                            }
                        } else if let Some(threshold) = op_map.get("gte") {
                            if !json_compare(val, threshold)?.ge() {
                                return Ok(false);
                            }
                        } else if let Some(threshold) = op_map.get("lte") {
                            if !json_compare(val, threshold)?.le() {
                                return Ok(false);
                            }
                        } else if let Some(threshold) = op_map.get("gt") {
                            if !json_compare(val, threshold)?.gt() {
                                return Ok(false);
                            }
                        } else if let Some(threshold) = op_map.get("lt") {
                            if !json_compare(val, threshold)?.lt() {
                                return Ok(false);
                            }
                        } else {
                            return Err(format!(
                                "Unknown operator object for field '{}': {:?}",
                                key, op_map
                            ));
                        }
                    }
                    // Plain literal — equality check
                    literal => {
                        if field_val != Some(literal) {
                            return Ok(false);
                        }
                    }
                }
            }

            Ok(true)
        }
        _ => Err(format!("Predicate must be a JSON object, got: {pred}")),
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Walk a dot-separated path through a JSON value.
fn get_path<'a>(ctx: &'a Value, path: &str) -> Option<&'a Value> {
    let mut current = ctx;
    for segment in path.split('.') {
        current = current.get(segment)?;
    }
    Some(current)
}

/// Return true if the `tags` array in `ctx` contains `tag`.
fn ctx_has_tag(ctx: &Value, tag: &str) -> bool {
    ctx.get("tags")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .any(|t| t.as_str().map(|s| s == tag).unwrap_or(false))
        })
        .unwrap_or(false)
}

/// Return true if any tag in `ctx["tags"]` matches the glob `pattern`.
///
/// Glob matching: split pattern on `*`, then match segments sequentially
/// through the candidate string (each segment must appear in order after the
/// previous one).
fn ctx_matches_glob(ctx: &Value, pattern: &str) -> bool {
    ctx.get("tags")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter().any(|t| {
                t.as_str()
                    .map(|s| glob_match(pattern, s))
                    .unwrap_or(false)
            })
        })
        .unwrap_or(false)
}

/// Minimal glob match: `*` is the only wildcard (matches any substring).
fn glob_match(pattern: &str, s: &str) -> bool {
    let parts: Vec<&str> = pattern.split('*').collect();
    if parts.len() == 1 {
        // No wildcard — exact match
        return pattern == s;
    }

    let mut remaining = s;

    // First segment must be a prefix
    if !remaining.starts_with(parts[0]) {
        return false;
    }
    remaining = &remaining[parts[0].len()..];

    // Middle segments must appear in order
    for part in &parts[1..parts.len() - 1] {
        if let Some(pos) = remaining.find(part) {
            remaining = &remaining[pos + part.len()..];
        } else {
            return false;
        }
    }

    // Last segment must be a suffix (or empty, meaning anything goes)
    let last = parts[parts.len() - 1];
    last.is_empty() || remaining.ends_with(last)
}

/// Ordering result for two JSON numbers.
#[derive(PartialEq, Eq)]
enum Ord {
    Less,
    Equal,
    Greater,
}

impl Ord {
    fn ge(&self) -> bool {
        matches!(self, Ord::Greater | Ord::Equal)
    }
    fn le(&self) -> bool {
        matches!(self, Ord::Less | Ord::Equal)
    }
    fn gt(&self) -> bool {
        matches!(self, Ord::Greater)
    }
    fn lt(&self) -> bool {
        matches!(self, Ord::Less)
    }
}

/// Compare two JSON values numerically.
fn json_compare(a: &Value, b: &Value) -> Result<Ord, String> {
    let av = to_f64(a).ok_or_else(|| format!("Cannot compare non-numeric value: {a}"))?;
    let bv = to_f64(b).ok_or_else(|| format!("Cannot compare non-numeric value: {b}"))?;
    if av < bv {
        Ok(Ord::Less)
    } else if av > bv {
        Ok(Ord::Greater)
    } else {
        Ok(Ord::Equal)
    }
}

fn to_f64(v: &Value) -> Option<f64> {
    match v {
        Value::Number(n) => n.as_f64(),
        _ => None,
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_equality() {
        let ctx = serde_json::json!({ "entity": { "class": "fighter" }, "level": 1 });
        let pred = serde_json::json!({ "entity.class": "fighter" });
        assert!(evaluate_predicate(&pred, &ctx).unwrap());
    }

    #[test]
    fn test_one_of() {
        let ctx = serde_json::json!({ "level": 2 });
        let pred = serde_json::json!({ "level": { "one_of": [1, 2, 4, 6, 8] } });
        assert!(evaluate_predicate(&pred, &ctx).unwrap());
        let ctx3 = serde_json::json!({ "level": 3 });
        assert!(!evaluate_predicate(&pred, &ctx3).unwrap());
    }

    #[test]
    fn test_all_combinator() {
        let ctx = serde_json::json!({ "entity": { "class": "fighter" }, "level": 4 });
        let pred = serde_json::json!({
            "all": [
                { "entity.class": "fighter" },
                { "level": { "one_of": [1, 2, 4, 6, 8] } }
            ]
        });
        assert!(evaluate_predicate(&pred, &ctx).unwrap());
    }

    #[test]
    fn test_not_combinator() {
        let ctx = serde_json::json!({ "entity": { "class": "wizard" } });
        let pred = serde_json::json!({ "not": { "entity.class": "fighter" } });
        assert!(evaluate_predicate(&pred, &ctx).unwrap());
    }

    #[test]
    fn test_has_tag() {
        let ctx = serde_json::json!({ "tags": ["source:phb", "role:martial"] });
        let pred = serde_json::json!({ "has_tag": "source:phb" });
        assert!(evaluate_predicate(&pred, &ctx).unwrap());
        let pred_missing = serde_json::json!({ "has_tag": "source:forge" });
        assert!(!evaluate_predicate(&pred_missing, &ctx).unwrap());
    }

    #[test]
    fn test_comparison_gte() {
        let ctx = serde_json::json!({ "level": 5 });
        assert!(evaluate_predicate(&serde_json::json!({ "level": {"gte": 3} }), &ctx).unwrap());
        assert!(!evaluate_predicate(&serde_json::json!({ "level": {"gte": 6} }), &ctx).unwrap());
    }

    #[test]
    fn test_has_property() {
        let ctx = serde_json::json!({ "abilities": { "str": { "score": 16 } } });
        let pred = serde_json::json!({ "has_property": "abilities.str.score" });
        assert!(evaluate_predicate(&pred, &ctx).unwrap());
        let pred_missing = serde_json::json!({ "has_property": "abilities.str.missing" });
        assert!(!evaluate_predicate(&pred_missing, &ctx).unwrap());
    }

    #[test]
    fn test_matches_glob() {
        let ctx = serde_json::json!({ "tags": ["source:phb"] });
        let pred = serde_json::json!({ "matches": "source:*" });
        assert!(evaluate_predicate(&pred, &ctx).unwrap());
        let pred_no_match = serde_json::json!({ "matches": "role:*" });
        assert!(!evaluate_predicate(&pred_no_match, &ctx).unwrap());
    }

    // --- extra coverage ---

    #[test]
    fn test_any_combinator() {
        let ctx = serde_json::json!({ "level": 7 });
        let pred = serde_json::json!({
            "any": [
                { "level": {"gte": 10} },
                { "level": {"gte": 5} }
            ]
        });
        assert!(evaluate_predicate(&pred, &ctx).unwrap());
    }

    #[test]
    fn test_none_of() {
        let ctx = serde_json::json!({ "level": 3 });
        let pred = serde_json::json!({ "level": { "none_of": [1, 2, 4] } });
        assert!(evaluate_predicate(&pred, &ctx).unwrap());
        let ctx2 = serde_json::json!({ "level": 2 });
        assert!(!evaluate_predicate(&pred, &ctx2).unwrap());
    }

    #[test]
    fn test_comparison_gt_lt_lte() {
        let ctx = serde_json::json!({ "level": 5 });
        assert!(evaluate_predicate(&serde_json::json!({ "level": {"gt": 4} }), &ctx).unwrap());
        assert!(!evaluate_predicate(&serde_json::json!({ "level": {"gt": 5} }), &ctx).unwrap());
        assert!(evaluate_predicate(&serde_json::json!({ "level": {"lt": 6} }), &ctx).unwrap());
        assert!(!evaluate_predicate(&serde_json::json!({ "level": {"lt": 5} }), &ctx).unwrap());
        assert!(evaluate_predicate(&serde_json::json!({ "level": {"lte": 5} }), &ctx).unwrap());
        assert!(!evaluate_predicate(&serde_json::json!({ "level": {"lte": 4} }), &ctx).unwrap());
    }

    #[test]
    fn test_equality_false_when_missing() {
        let ctx = serde_json::json!({ "level": 1 });
        let pred = serde_json::json!({ "entity.class": "fighter" });
        assert!(!evaluate_predicate(&pred, &ctx).unwrap());
    }

    #[test]
    fn test_glob_no_wildcard_exact() {
        let ctx = serde_json::json!({ "tags": ["source:phb"] });
        let pred = serde_json::json!({ "matches": "source:phb" });
        assert!(evaluate_predicate(&pred, &ctx).unwrap());
        let pred2 = serde_json::json!({ "matches": "source:dmg" });
        assert!(!evaluate_predicate(&pred2, &ctx).unwrap());
    }
}
