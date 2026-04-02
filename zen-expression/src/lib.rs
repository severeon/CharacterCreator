use wasm_bindgen::prelude::*;

/// WASM: Evaluate a Zen-expression formula against a JSON context.
/// Returns the result as a JSON string.
#[wasm_bindgen]
pub fn evaluate(formula: &str, context_json: &str) -> Result<JsValue, JsValue> {
    let context: serde_json::Value = serde_json::from_str(context_json)
        .map_err(|e| JsValue::from_str(&format!("context parse error: {e}")))?;

    match eval_expr(formula, &context) {
        Ok(result) => serde_json::to_string(&result)
            .map(|s| JsValue::from_str(&s))
            .map_err(|e| JsValue::from_str(&format!("serialize error: {e}"))),
        Err(e) => Err(JsValue::from_str(&e)),
    }
}

/// Native Rust evaluator - same logic, no WASM overhead.
/// Returns Result<Value, String>.
pub fn evaluate_native(formula: &str, context: &serde_json::Value) -> Result<serde_json::Value, String> {
    eval_expr(formula, context)
}

fn eval_expr(formula: &str, context: &serde_json::Value) -> Result<serde_json::Value, String> {
    let formula = formula.trim();

    // Handle if-then-else
    if formula.starts_with("if ") {
        return eval_conditional(formula, context);
    }

    // Handle function calls: floor(), ceil(), min(), max(), lookup(), abs()
    if let Some(paren_pos) = formula.find('(') {
        let func_name = &formula[..paren_pos];
        let args_str = &formula[paren_pos + 1..formula.len() - 1];
        return eval_function(func_name, args_str, context);
    }

    // Handle arithmetic: parse expression tree
    eval_arithmetic(formula, context)
}

fn eval_conditional(formula: &str, context: &serde_json::Value) -> Result<serde_json::Value, String> {
    // "if condition then then_val else else_val"
    let parts: Vec<&str> = formula.split_whitespace().collect();
    if parts.len() < 5 {
        return Err(format!("Invalid conditional: {}", formula));
    }
    // parts[0]="if", parts[1]=condition, parts[2]="then", parts[3]=then_val, parts[4]="else", rest=else_val
    let condition = parts[1];
    let then_val = parts[3];
    let else_val = parts[5..].join(" ");

    let cond_result = eval_expr(condition, context)?;
    let cond_bool = as_bool(&cond_result);

    if cond_bool {
        eval_expr(then_val.trim_matches(|c| c == '(' || c == ')'), context)
    } else {
        eval_expr(else_val.trim_matches(|c| c == '(' || c == ')'), context)
    }
}

fn as_bool(v: &serde_json::Value) -> bool {
    match v {
        serde_json::Value::Bool(b) => *b,
        serde_json::Value::Number(n) => n.as_f64().map(|f| f != 0.0).unwrap_or(false),
        serde_json::Value::String(s) => !s.is_empty(),
        _ => false,
    }
}

fn eval_function(func_name: &str, args_str: &str, context: &serde_json::Value) -> Result<serde_json::Value, String> {
    let args: Vec<&str> = split_args(args_str);
    match func_name {
        "floor" | "ceil" => {
            if args.len() != 1 {
                return Err(format!("{} takes 1 argument", func_name));
            }
            let val = eval_expr(args[0], context)?;
            let num = as_f64(&val).ok_or("floor/ceil requires numeric")?;
            Ok(serde_json::Value::Number(if func_name == "floor" {
                serde_json::Number::from_f64(num.floor()).unwrap_or(serde_json::Number::from(0))
            } else {
                serde_json::Number::from_f64(num.ceil()).unwrap_or(serde_json::Number::from(0))
            }))
        }
        "abs" => {
            let val = eval_expr(args[0], context)?;
            let num = as_f64(&val).ok_or("abs requires numeric")?;
            Ok(serde_json::Value::Number(serde_json::Number::from_f64(num.abs()).unwrap_or(serde_json::Number::from(0))))
        }
        "min" | "max" => {
            let mut nums = Vec::new();
            for arg in &args {
                let val = eval_expr(arg, context)?;
                nums.push(as_f64(&val).ok_or("min/max requires numeric")?);
            }
            let result = if func_name == "min" { nums.iter().cloned().fold(f64::INFINITY, f64::min) } else { nums.iter().cloned().fold(f64::NEG_INFINITY, f64::max) };
            Ok(serde_json::Value::Number(serde_json::Number::from_f64(result).unwrap_or(serde_json::Number::from(0))))
        }
        "lookup" => {
            if args.len() != 2 {
                return Err("lookup takes 2 arguments".to_string());
            }
            let table_name = eval_expr(args[0], context)?;
            let key_name = eval_expr(args[1], context)?;
            let table = get_value_by_path(context, &as_str(&table_name))?;
            let key_str = as_str(&key_name);
            if let Some(arr) = table.as_array() {
                for item in arr {
                    if let Some(v) = item.get(&key_str) {
                        return Ok(v.clone());
                    }
                }
            }
            Err(format!("lookup failed: key '{}' not found", key_str))
        }
        "if" => eval_conditional(&format!("if {} then {} else {}", args[0], args[1], args[2]), context),
        _ => Err(format!("Unknown function: {}", func_name)),
    }
}

fn split_args(s: &str) -> Vec<&str> {
    let mut args = Vec::new();
    let mut depth = 0;
    let mut last = 0;
    let chars: Vec<char> = s.chars().collect();
    for (i, c) in chars.iter().enumerate() {
        if *c == ',' && depth == 0 {
            args.push(&s[last..i]);
            last = i + 1;
        } else if *c == '(' || *c == '[' || *c == '{' {
            depth += 1;
        } else if *c == ')' || *c == ']' || *c == '}' {
            depth -= 1;
        }
    }
    if last < s.len() { args.push(&s[last..]); }
    args.iter().map(|s| s.trim()).collect()
}

fn eval_arithmetic(formula: &str, context: &serde_json::Value) -> Result<serde_json::Value, String> {
    let formula = formula.trim();

    // String literal
    if formula.starts_with('"') && formula.ends_with('"') {
        return Ok(serde_json::Value::String(formula[1..formula.len()-1].to_string()));
    }

    // Property access via dot notation
    if formula.contains('.') && !formula.contains('(') {
        let value = get_value_by_path(context, formula)?;
        return Ok(value.clone());
    }

    // Boolean literal
    if formula == "true" { return Ok(serde_json::Value::Bool(true)); }
    if formula == "false" { return Ok(serde_json::Value::Bool(false)); }

    // Number literal
    if let Ok(n) = formula.parse::<f64>() {
        return Ok(serde_json::Number::from_f64(n)
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null));
    }

    // Boolean path lookup
    if let Ok(v) = get_value_by_path(context, formula) {
        return Ok(v.clone());
    }

    Err(format!("Cannot evaluate: {}", formula))
}

fn get_value_by_path<'a>(context: &'a serde_json::Value, path: &str) -> Result<&'a serde_json::Value, String> {
    let parts: Vec<&str> = path.split('.').collect();
    let mut current: &'a serde_json::Value = context;
    for part in parts {
        current = current.get(part).ok_or_else(|| format!("path not found: {}", path))?;
    }
    Ok(current)
}

fn as_f64(v: &serde_json::Value) -> Option<f64> {
    v.as_f64().or_else(|| v.as_i64().map(|i| i as f64))
}

fn as_str(v: &serde_json::Value) -> String {
    v.as_str().map(|s| s.to_string()).unwrap_or_default()
}
