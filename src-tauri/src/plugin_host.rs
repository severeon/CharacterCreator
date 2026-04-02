use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginContext {
    pub event: String,
    pub entity_state: serde_json::Value,
    pub campaign_context: serde_json::Value,
    pub config: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginOperation {
    pub op: String,
    pub path: String,
    pub value: serde_json::Value,
}

const VALID_OPS: &[&str] = &["set", "add", "sub", "multiply", "grant", "revoke", "push", "pop", "clear"];

/// Validate that a plugin's returned operations are all valid Arcanum operations.
pub fn validate_operations(ops: &[PluginOperation]) -> Result<(), String> {
    for op in ops {
        if !VALID_OPS.contains(&op.op.as_str()) {
            return Err(format!("Unknown operation '{}' from plugin", op.op));
        }
        if op.path.is_empty() {
            return Err("Operation path cannot be empty".to_string());
        }
    }
    Ok(())
}

/// Call a plugin — stub for Phase 6 WASM/Lua runtime integration.
pub async fn call_plugin(
    _plugin_id: &str,
    _context: PluginContext,
) -> Result<Vec<PluginOperation>, String> {
    Ok(vec![])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_operations_pass() {
        let ops = vec![
            PluginOperation { op: "set".into(), path: "hp".into(), value: serde_json::json!(50) }
        ];
        assert!(validate_operations(&ops).is_ok());
    }

    #[test]
    fn test_unknown_op_rejected() {
        let ops = vec![
            PluginOperation { op: "fly".into(), path: "hp".into(), value: serde_json::json!(50) }
        ];
        assert!(validate_operations(&ops).is_err());
    }

    #[test]
    fn test_empty_path_rejected() {
        let ops = vec![
            PluginOperation { op: "set".into(), path: "".into(), value: serde_json::json!(1) }
        ];
        assert!(validate_operations(&ops).is_err());
    }
}
