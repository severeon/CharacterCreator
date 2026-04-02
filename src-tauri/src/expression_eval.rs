use serde_json::Value;
use zen_expression::evaluate_native;

/// Evaluate a Zen-expression formula against a JSON context.
/// This is a native Rust implementation — the same logic as the WASM module.
/// We use the native implementation in Rust to avoid WASM overhead in the engine.
pub fn evaluate(formula: &str, context: &Value) -> Result<Value, String> {
    zen_expression::evaluate_native(formula, context)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_property_access() {
        let ctx = serde_json::json!({
            "abilities": { "str": { "score": 16 } }
        });
        let result = evaluate("abilities.str.score", &ctx).unwrap();
        assert_eq!(result, 16);
    }

    #[test]
    fn test_floor() {
        let ctx = serde_json::json!({
            "value": 3.7
        });
        let result = evaluate("floor(value)", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 3.0);
    }

    #[test]
    fn test_if_then_else() {
        // zen_expression conditional splits on whitespace tokens:
        //   "if <cond> then <single_token> else <rest>"
        // Use context values as the single-token branches so arithmetic is not needed.
        let ctx = serde_json::json!({ "is_class_skill": true, "low_val": 2, "high_val": 8 });
        let result = evaluate("if is_class_skill then high_val else low_val", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 8.0);
    }

    #[test]
    fn test_lookup() {
        // lookup(table_name_expr, key_expr) works as follows:
        //   1. evaluates table_name_expr to a string (e.g. "full")
        //   2. looks up that string as a root-level context path to get an array
        //   3. evaluates key_expr to a string, searches each array item for that key
        // Context must have "full" at the root pointing to an array of objects.
        let ctx = serde_json::json!({
            "prog_name": "full",
            "full": [
                { "bab": 1 }
            ],
            "item_key": "bab"
        });
        let result = evaluate("lookup(prog_name, item_key)", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 1.0);
    }

    #[test]
    fn test_boolean_literal() {
        let ctx = serde_json::json!({});
        let result = evaluate("true", &ctx).unwrap();
        assert_eq!(result, true);
    }

    #[test]
    fn test_number_literal() {
        let ctx = serde_json::json!({});
        let result = evaluate("42", &ctx).unwrap();
        assert_eq!(result.as_f64().unwrap(), 42.0);
    }
}
