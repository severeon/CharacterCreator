use evalexpr::*;
use serde_json::Value;

/// Evaluate a formula against a JSON context.
///
/// Supported syntax:
/// - Arithmetic with parentheses: `(score - 10) / 2`
/// - Built-in math functions: `floor(...)`, `ceil(...)`, `round(...)`, `abs(...)`, `min(...)`, `max(...)`
/// - Comparisons: `score > 10`, `level == 5`
/// - Boolean logic: `is_class_skill && level > 3`
/// - if/then/else (D&D formula style): `if is_class_skill then level + 3 else level`
///   → translated to evalexpr syntax: `if is_class_skill { level + 3 } else { level }`
/// - Dot-notation property access (flattened): `abilities.str.score` → `abilities__str__score`
/// - lookup(table_key, index): resolves array lookups from context
pub fn evaluate(formula: &str, context: &Value) -> Result<Value, String> {
    // Step 1: handle lookup() before any other processing
    let formula = preprocess_lookup(formula, context)?;

    // Step 2: translate `if X then Y else Z` → `if X { Y } else { Z }`
    let formula = preprocess_if_then_else(&formula);

    // Step 3: replace dot notation with double-underscore (evalexpr doesn't allow dots in identifiers)
    let formula = formula.replace('.', "__");

    // Step 4: build evalexpr context by flattening the JSON
    let mut ctx = HashMapContext::new();
    flatten_json_to_context(context, "", &mut ctx);

    // Step 5: evaluate
    let result = eval_with_context(&formula, &ctx)
        .map_err(|e| format!("Expression eval error for `{}`: {}", formula, e))?;

    // Step 6: convert evalexpr::Value → serde_json::Value
    match result {
        evalexpr::Value::Float(f) => {
            if f.is_infinite() || f.is_nan() {
                Err(format!("Expression '{}' produced non-finite result: {}", formula, f))
            } else {
                Ok(serde_json::json!(f))
            }
        }
        // Cast to f64 for consistency with the engine's numeric model — all numbers flow as
        // floats through the evaluation pipeline so downstream consumers don't need to
        // special-case integer vs float results.
        evalexpr::Value::Int(i) => Ok(serde_json::json!(i as f64)),
        evalexpr::Value::Boolean(b) => Ok(serde_json::json!(b)),
        evalexpr::Value::String(s) => Ok(serde_json::json!(s)),
        evalexpr::Value::Tuple(_) => Err("Tuple results are not supported".to_string()),
        evalexpr::Value::Empty => Err("Expression returned empty value".to_string()),
    }
}

/// Translate `if COND then THEN_EXPR else ELSE_EXPR` into evalexpr's
/// function-call syntax: `if(COND, THEN_EXPR, ELSE_EXPR)`.
///
/// evalexpr v11 uses `if(cond, then_val, else_val)` — not block syntax.
fn preprocess_if_then_else(formula: &str) -> String {
    let trimmed = formula.trim();

    // Check if it starts with `if ` (case-sensitive, per D&D formula convention)
    if !trimmed.starts_with("if ") {
        return formula.to_string();
    }

    // Find the last `then` and `else` that are whole words
    if let Some(then_pos) = find_keyword(trimmed, "then") {
        if let Some(else_pos) = find_keyword(trimmed, "else") {
            if else_pos > then_pos {
                let cond = trimmed[3..then_pos].trim();
                let then_expr = trimmed[then_pos + 4..else_pos].trim();
                let else_expr = trimmed[else_pos + 4..].trim();
                return format!("if({}, {}, {})", cond, then_expr, else_expr);
            }
        }
    }

    formula.to_string()
}

/// Find the byte-offset of the last whole-word occurrence of `keyword` in `s`.
/// "Whole word" means: not preceded or followed by `[a-zA-Z0-9_]`.
fn find_keyword(s: &str, keyword: &str) -> Option<usize> {
    let klen = keyword.len();
    let bytes = s.as_bytes();
    let mut found = None;

    let mut i = 0;
    while i + klen <= s.len() {
        if s[i..].starts_with(keyword) {
            let before_ok = i == 0 || (!bytes[i - 1].is_ascii_alphanumeric() && bytes[i - 1] != b'_');
            let after_ok = i + klen == s.len()
                || (!bytes[i + klen].is_ascii_alphanumeric() && bytes[i + klen] != b'_');
            if before_ok && after_ok {
                found = Some(i);
            }
        }
        i += 1;
    }

    found
}

/// Recursively search `context` and its nested objects for a key whose value is an array.
/// Returns the first match found (depth-first, top-level checked first).
fn find_nested_array<'a>(context: &'a Value, key: &str) -> Option<&'a Value> {
    // First try top-level
    if let Some(v) = context.get(key) {
        if v.is_array() {
            return Some(v);
        }
    }
    // Then search recursively in nested objects
    if let Value::Object(map) = context {
        for (_, v) in map {
            if let Some(found) = find_nested_array(v, key) {
                return Some(found);
            }
        }
    }
    None
}

/// Handle `lookup(table_key_expr, index_expr)` calls by resolving them against
/// the context before handing off to evalexpr.
///
/// Supports multiple `lookup()` calls in a single formula by looping until none remain.
///
/// Semantics:
/// 1. Evaluate `table_key_expr` as a string to get the array name (e.g. `"full"`).
/// 2. Look up that name in the context (including nested objects) to get an array.
/// 3. Evaluate `index_expr` as an integer (0-based) OR as a string key.
///    - If integer: return `array[index]` as a number.
///    - If string: treat array items as objects and return the value at that key from item 0.
///
/// The result is substituted back into the formula as a numeric literal.
pub fn preprocess_lookup(formula: &str, context: &Value) -> Result<String, String> {
    let mut result = formula.to_string();
    while result.contains("lookup(") {
        result = preprocess_single_lookup(&result, context)?;
    }
    Ok(result)
}

fn preprocess_single_lookup(formula: &str, context: &Value) -> Result<String, String> {
    let trimmed = formula.trim();

    // Find the lookup( call
    let start = trimmed.find("lookup(").ok_or("malformed lookup")?;
    let after_open = start + "lookup(".len();
    let close = trimmed[after_open..]
        .find(')')
        .ok_or("lookup() missing closing paren")?
        + after_open;

    let args_str = &trimmed[after_open..close];
    let args: Vec<&str> = args_str.splitn(2, ',').collect();
    if args.len() != 2 {
        return Err(format!("lookup() requires exactly 2 arguments, got: `{}`", args_str));
    }

    let table_key_expr = args[0].trim();
    let index_expr = args[1].trim();

    // Resolve the table key: look it up in context directly (it should be a var name or string literal)
    let table_name = resolve_string_from_context(table_key_expr, context)?;

    // Get the array from context, searching nested objects if not found at top level
    let array = find_nested_array(context, &table_name)
        .ok_or_else(|| format!("lookup: no context key `{}`", table_name))?;
    let arr = array
        .as_array()
        .ok_or_else(|| format!("lookup: context key `{}` is not an array", table_name))?;

    // Resolve the index: try integer first, then string key.
    // Numeric indices are 1-based (D&D level 1 → array[0]).
    let resolved_value = if let Ok(idx_1based) = index_expr.parse::<usize>() {
        // Numeric literal index (1-based)
        let idx = idx_1based.saturating_sub(1);
        arr.get(idx)
            .and_then(|v| v.as_f64())
            .ok_or_else(|| format!("lookup: index {} out of bounds or not a number", idx_1based))?
    } else {
        // Variable that holds either an integer (1-based level) or string (object key)
        let index_val = context.get(index_expr);
        match index_val {
            Some(Value::Number(n)) => {
                let idx_1based = n.as_u64().unwrap_or(1) as usize;
                let idx = idx_1based.saturating_sub(1);
                arr.get(idx)
                    .and_then(|v| v.as_f64())
                    .ok_or_else(|| format!("lookup: index {} out of bounds or not a number", idx_1based))?
            }
            Some(Value::String(key)) => {
                // Array of objects: grab the key from the first item
                arr.first()
                    .and_then(|item| item.get(key))
                    .and_then(|v| v.as_f64())
                    .ok_or_else(|| format!("lookup: key `{}` not found in array items", key))?
            }
            _ => {
                // Try treating index_expr as a context variable that resolves to an integer
                return Err(format!(
                    "lookup: cannot resolve index expression `{}`",
                    index_expr
                ));
            }
        }
    };

    // Substitute the lookup call with the resolved numeric literal
    let before = &trimmed[..start];
    let after = &trimmed[close + 1..];
    let substituted = format!("{}{}{}", before, resolved_value, after);
    Ok(substituted)
}

/// Resolve a simple string from context: either a string literal (`"foo"`) or a variable name.
fn resolve_string_from_context(expr: &str, context: &Value) -> Result<String, String> {
    // String literal
    if expr.starts_with('"') && expr.ends_with('"') {
        return Ok(expr[1..expr.len() - 1].to_string());
    }
    // Variable lookup
    context
        .get(expr)
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("lookup: cannot resolve `{}` to a string", expr))
}

/// Flatten a nested JSON object into a `HashMapContext` using `__` as the separator.
///
/// Example: `{"abilities": {"str": {"score": 16}}}` → key `abilities__str__score` = 16.0
fn flatten_json_to_context(value: &Value, prefix: &str, ctx: &mut HashMapContext) {
    match value {
        Value::Object(map) => {
            for (k, v) in map {
                let key = if prefix.is_empty() {
                    k.clone()
                } else {
                    format!("{}__{}", prefix, k)
                };
                flatten_json_to_context(v, &key, ctx);
            }
        }
        Value::Number(n) => {
            let _ = ctx.set_value(
                prefix.to_string(),
                evalexpr::Value::Float(n.as_f64().unwrap_or(0.0)),
            );
        }
        Value::Bool(b) => {
            let _ = ctx.set_value(prefix.to_string(), evalexpr::Value::Boolean(*b));
        }
        Value::String(s) => {
            let _ = ctx.set_value(prefix.to_string(), evalexpr::Value::String(s.clone()));
        }
        Value::Array(arr) => {
            // Store arrays as their JSON representation; not directly queryable by evalexpr
            // but lookup() pre-processing handles array access before we get here.
            let json_str = serde_json::to_string(arr).unwrap_or_default();
            let _ = ctx.set_value(prefix.to_string(), evalexpr::Value::String(json_str));
        }
        Value::Null => {
            // Nulls are skipped; missing variables will produce an evalexpr error.
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parenthesized_arithmetic() {
        let ctx = serde_json::json!({"score": 16});
        let result = evaluate("(score - 10) / 2", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 3.0);
    }

    #[test]
    fn test_floor_compound() {
        let ctx = serde_json::json!({"level": 5});
        let result = evaluate("floor((level - 1) / 4) + 2", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 3.0);
    }

    #[test]
    fn test_nested_property_access() {
        let ctx = serde_json::json!({"abilities": {"str": {"score": 16}}});
        let result = evaluate("abilities.str.score", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 16.0);
    }

    #[test]
    fn test_if_then_else_arithmetic() {
        let ctx = serde_json::json!({"is_class_skill": true, "level": 5});
        let result = evaluate("if is_class_skill then level + 3 else level", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 8.0);
    }

    #[test]
    fn test_if_then_else_false_branch() {
        let ctx = serde_json::json!({"is_class_skill": false, "level": 5});
        let result = evaluate("if is_class_skill then level + 3 else level", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 5.0);
    }

    #[test]
    fn test_comparison() {
        let ctx = serde_json::json!({"score": 16});
        let result = evaluate("score > 10", &ctx).unwrap();
        assert_eq!(result.as_bool().unwrap(), true);
    }

    #[test]
    fn test_comparison_false() {
        let ctx = serde_json::json!({"score": 8});
        let result = evaluate("score > 10", &ctx).unwrap();
        assert_eq!(result.as_bool().unwrap(), false);
    }

    #[test]
    fn test_lookup_with_integer_index() {
        // lookup(prog_name, 0) where prog_name resolves to "full" array
        let ctx = serde_json::json!({
            "prog_name": "full",
            "full": [1, 2, 3, 4, 5],
            "level": 1
        });
        let result = evaluate("lookup(prog_name, 0)", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 1.0);
    }

    #[test]
    fn test_lookup_with_key() {
        // lookup(prog_name, item_key) where item_key is "bab" and array contains objects
        let ctx = serde_json::json!({
            "prog_name": "full",
            "full": [{"bab": 1}],
            "item_key": "bab"
        });
        let result = evaluate("lookup(prog_name, item_key)", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 1.0);
    }

    #[test]
    fn test_lookup_level_based() {
        // Typical BAB lookup: lookup(bab_progression, level) where level is a numeric index.
        // Context: only nested path (no top-level alias) — proves recursive search works.
        let ctx = serde_json::json!({
            "bab_progression": "full",
            "progressions": { "full": [1, 2, 3, 4, 5] },
            "level": 2
        });
        let result = evaluate("lookup(bab_progression, level)", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 2.0);
    }

    #[test]
    fn test_multi_lookup_formula() {
        // Two lookup() calls in one formula — e.g. total attack bonus combining BAB and melee bonus.
        let ctx = serde_json::json!({
            "bab_prog": "full",
            "save_prog": "good",
            "full": [1, 2, 3, 4, 5],
            "good": [2, 3, 3, 4, 4],
            "level": 3
        });
        let result = evaluate("lookup(bab_prog, level) + lookup(save_prog, level)", &ctx).unwrap();
        // level 3 → full[2] = 3, good[2] = 3 → 6
        assert_eq!(result.as_f64().unwrap(), 6.0);
    }

    #[test]
    fn test_division_by_zero_returns_error() {
        let ctx = serde_json::json!({"a": 1, "b": 0});
        let result = evaluate("a / b", &ctx);
        assert!(result.is_err(), "expected error for division by zero");
    }

    #[test]
    fn test_floor_simple() {
        let ctx = serde_json::json!({"value": 3.7});
        let result = evaluate("floor(value)", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 3.0);
    }

    #[test]
    fn test_boolean_literal() {
        let ctx = serde_json::json!({});
        let result = evaluate("true", &ctx).unwrap();
        assert_eq!(result.as_bool().unwrap(), true);
    }

    #[test]
    fn test_number_literal() {
        let ctx = serde_json::json!({});
        let result = evaluate("42", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 42.0);
    }

    #[test]
    fn test_property_access_simple() {
        let ctx = serde_json::json!({"score": 16});
        let result = evaluate("score", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 16.0);
    }
}
