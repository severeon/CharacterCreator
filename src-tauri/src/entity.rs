use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A flexible value type for entity properties.
/// IMPORTANT: Null must be LAST to avoid greedy serde matching with untagged.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(untagged)]
pub enum Value {
    Bool(bool),
    Int(i64),
    Float(f64),
    Str(String),
    List(Vec<Value>),
    Map(HashMap<String, Value>),
    Null,
}

/// A full entity loaded from an MDX content file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entity {
    pub id: String,
    pub entity_type: String,
    pub properties: HashMap<String, Value>,
    pub tags: Vec<String>,
    #[serde(default)]
    pub mdx_body: String,
    #[serde(default)]
    pub source_pack: String,
}

/// A lightweight summary for list views.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntitySummary {
    pub id: String,
    pub entity_type: String,
    pub name: String,
    pub tags: Vec<String>,
}

impl Entity {
    /// Extract a summary from this entity.
    /// Name is pulled from properties["name"], falling back to the entity id.
    pub fn to_summary(&self) -> EntitySummary {
        let name = match self.properties.get("name") {
            Some(Value::Str(s)) => s.clone(),
            _ => self.id.clone(),
        };
        EntitySummary {
            id: self.id.clone(),
            entity_type: self.entity_type.clone(),
            name,
            tags: self.tags.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_value_serde_roundtrip() {
        let val = Value::Int(42);
        let json = serde_json::to_string(&val).unwrap();
        let back: Value = serde_json::from_str(&json).unwrap();
        assert_eq!(back, Value::Int(42));
    }

    #[test]
    fn test_value_null_last() {
        // Ensure null deserializes correctly and doesn't greedily match
        let val: Value = serde_json::from_str("null").unwrap();
        assert_eq!(val, Value::Null);

        let val: Value = serde_json::from_str("\"hello\"").unwrap();
        assert_eq!(val, Value::Str("hello".to_string()));

        let val: Value = serde_json::from_str("true").unwrap();
        assert_eq!(val, Value::Bool(true));
    }

    #[test]
    fn test_entity_to_summary() {
        let mut props = HashMap::new();
        props.insert("name".to_string(), Value::Str("Fighter".to_string()));

        let entity = Entity {
            id: "test:class:fighter".to_string(),
            entity_type: "class".to_string(),
            properties: props,
            tags: vec!["source:phb".to_string()],
            mdx_body: "## Fighter".to_string(),
            source_pack: "test-pack".to_string(),
        };

        let summary = entity.to_summary();
        assert_eq!(summary.name, "Fighter");
        assert_eq!(summary.entity_type, "class");
        assert_eq!(summary.id, "test:class:fighter");
    }

    #[test]
    fn test_entity_to_summary_no_name() {
        let entity = Entity {
            id: "test:class:unknown".to_string(),
            entity_type: "class".to_string(),
            properties: HashMap::new(),
            tags: vec![],
            mdx_body: String::new(),
            source_pack: String::new(),
        };

        let summary = entity.to_summary();
        assert_eq!(summary.name, "test:class:unknown");
    }
}
