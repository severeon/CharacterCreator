use serde_yaml::Value;
use std::collections::HashMap;
use std::path::Path;

/// Validates an entity's YAML frontmatter against its schema.
/// Returns Ok(()) on valid, Err(String) on invalid.
pub fn validate_entity(
    entity_yaml: &str,
    schema_yaml: &str,
) -> Result<(), String> {
    let schema: Value = serde_yaml::from_str(schema_yaml)
        .map_err(|e| format!("Failed to parse schema YAML: {e}"))?;
    let entity: Value = serde_yaml::from_str(entity_yaml)
        .map_err(|e| format!("Failed to parse entity YAML: {e}"))?;

    // Convert YAML values to JSON values for jsonschema
    let schema_json = serde_json::to_string(&schema)
        .map_err(|e| format!("Failed to convert schema to JSON: {e}"))?;
    let entity_json = serde_json::to_string(&entity)
        .map_err(|e| format!("Failed to convert entity to JSON: {e}"))?;

    let schema_value: serde_json::Value = serde_json::from_str(&schema_json)
        .map_err(|e| format!("Failed to parse schema JSON: {e}"))?;
    let entity_value: serde_json::Value = serde_json::from_str(&entity_json)
        .map_err(|e| format!("Failed to parse entity JSON: {e}"))?;

    let validator = jsonschema::validator_for(&schema_value)
        .map_err(|e| format!("Failed to create validator: {e}"))?;

    let errors: Vec<String> = validator
        .iter_errors(&entity_value)
        .map(|e| e.to_string())
        .collect();

    if errors.is_empty() {
        Ok(())
    } else {
        Err(format!("Validation failed: {}", errors.join("; ")))
    }
}

/// Load all schemas from a pack's schemas/ directory.
pub fn load_schemas(schemas_dir: &Path) -> Result<HashMap<String, String>, String> {
    let mut schemas = HashMap::new();
    for entry in std::fs::read_dir(schemas_dir)
        .map_err(|e| format!("Failed to read schemas dir: {e}"))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) == Some("yaml") {
            let name = path.file_stem()
                .and_then(|s| s.to_str())
                .ok_or("Invalid schema filename")?
                .replace(".schema", "");
            let content = std::fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read schema: {e}"))?;
            schemas.insert(name, content);
        }
    }
    Ok(schemas)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_entity_passes() {
        let schema_yaml = r#"
type: object
required: [id, entity_type, properties]
properties:
  id: { type: string }
  entity_type: { type: string }
  properties:
    type: object
    required: [name]
    properties:
      name: { type: string }
"#;
        let entity_yaml = r#"
id: "test:mechanic:test"
entity_type: "mechanic"
properties:
  name: "Test Mechanic"
"#;
        assert!(validate_entity(entity_yaml, schema_yaml).is_ok());
    }

    #[test]
    fn test_missing_required_field_fails() {
        let schema_yaml = r#"
type: object
required: [id, entity_type]
properties:
  id: { type: string }
  entity_type: { type: string }
"#;
        let entity_yaml = r#"
id: "test:mechanic:test"
"#;
        assert!(validate_entity(entity_yaml, schema_yaml).is_err());
    }
}
