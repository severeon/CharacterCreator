use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::computed_view::ComputedView;
use crate::subscription::Subscription;

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

#[allow(dead_code)]
impl Value {
    pub fn as_int(&self) -> Option<i64> {
        match self {
            Value::Int(i) => Some(*i),
            _ => None,
        }
    }

    pub fn as_str(&self) -> Option<&str> {
        match self {
            Value::Str(s) => Some(s),
            _ => None,
        }
    }

    #[allow(dead_code)]
    pub fn as_bool(&self) -> Option<bool> {
        match self {
            Value::Bool(b) => Some(*b),
            _ => None,
        }
    }

    pub fn as_list(&self) -> Option<&Vec<Value>> {
        match self {
            Value::List(l) => Some(l),
            _ => None,
        }
    }

    #[allow(dead_code)]
    pub fn as_map(&self) -> Option<&HashMap<String, Value>> {
        match self {
            Value::Map(m) => Some(m),
            _ => None,
        }
    }

    #[allow(dead_code)]
    pub fn get_nested(&self, path: &str) -> Option<&Value> {
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = self;
        for part in parts {
            current = match current {
                Value::Map(m) => m.get(part)?,
                _ => return None,
            };
        }
        Some(current)
    }

    #[allow(dead_code)]
    pub fn with_path(&self, path: &str, value: Value) -> Value {
        let parts: Vec<&str> = path.split('.').collect();
        if parts.len() == 1 {
            if let Value::Map(mut m) = self.clone() {
                m.insert(parts[0].to_string(), value);
                Value::Map(m)
            } else {
                Value::Map(HashMap::new())
            }
        } else {
            let head = parts[0];
            let rest = parts[1..].join(".");
            if let Value::Map(mut m) = self.clone() {
                let inner = m.get(head).cloned().unwrap_or(Value::Map(HashMap::new()));
                m.insert(head.to_string(), inner.with_path(&rest, value));
                Value::Map(m)
            } else {
                Value::Map(HashMap::new())
            }
        }
    }
}

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
    #[serde(default)]
    pub subscriptions: Vec<Subscription>,
    #[serde(default)]
    pub computed_views: Vec<ComputedView>,
    #[serde(default)]
    pub prototype: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntitySummary {
    pub id: String,
    pub entity_type: String,
    pub name: String,
    pub tags: Vec<String>,
}

#[allow(dead_code)]
impl Entity {
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

    pub fn get_property(&self, path: &str) -> Option<&Value> {
        self.properties.get(path)
    }

    pub fn set_property(&mut self, path: &str, value: Value) {
        self.properties.insert(path.to_string(), value);
    }

    pub fn remove_property(&mut self, path: &str) {
        self.properties.remove(path);
    }

    pub fn has_subscription(&self, trigger: &str) -> bool {
        self.subscriptions.iter().any(|s| s.trigger == trigger)
    }

    pub fn get_subscriptions(&self) -> &[Subscription] {
        &self.subscriptions
    }

    pub fn add_subscription(&mut self, subscription: Subscription) {
        self.subscriptions.push(subscription);
    }

    pub fn add_computed_view(&mut self, view: ComputedView) {
        self.computed_views.push(view);
    }

    pub fn derive_from(&mut self, source: &Entity) {
        self.prototype = Some(source.id.clone());
        for (key, value) in &source.properties {
            if !self.properties.contains_key(key) {
                self.properties.insert(key.clone(), value.clone());
            }
        }
        for tag in &source.tags {
            if !self.tags.contains(tag) {
                self.tags.push(tag.clone());
            }
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
        let val: Value = serde_json::from_str("null").unwrap();
        assert_eq!(val, Value::Null);

        let val: Value = serde_json::from_str("\"hello\"").unwrap();
        assert_eq!(val, Value::Str("hello".to_string()));

        let val: Value = serde_json::from_str("true").unwrap();
        assert_eq!(val, Value::Bool(true));
    }

    #[test]
    fn test_value_nested() {
        let mut map = HashMap::new();
        map.insert("modifier".to_string(), Value::Int(3));
        let mut abilities = HashMap::new();
        abilities.insert("strength".to_string(), Value::Map(map));
        let props = Value::Map(abilities);

        assert!(matches!(
            props.get_nested("strength.modifier"),
            Some(Value::Int(3))
        ));
        assert!(props.get_nested("strength.modifier.missing").is_none());
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
            subscriptions: vec![],
            computed_views: vec![],
            prototype: None,
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
            subscriptions: vec![],
            computed_views: vec![],
            prototype: None,
        };

        let summary = entity.to_summary();
        assert_eq!(summary.name, "test:class:unknown");
    }

    #[test]
    fn test_entity_derive_from() {
        let mut source = Entity {
            id: "srd:race:human".to_string(),
            entity_type: "race".to_string(),
            properties: HashMap::new(),
            tags: vec!["source:phb".to_string()],
            mdx_body: String::new(),
            source_pack: "srd-3.5e".to_string(),
            subscriptions: vec![],
            computed_views: vec![],
            prototype: None,
        };
        source.set_property("name", Value::Str("Human".to_string()));
        source.set_property("size", Value::Str("Medium".to_string()));

        let mut target = Entity {
            id: "campaign:thorin".to_string(),
            entity_type: "character".to_string(),
            properties: HashMap::new(),
            tags: vec![],
            mdx_body: String::new(),
            source_pack: "hoyts-campaign".to_string(),
            subscriptions: vec![],
            computed_views: vec![],
            prototype: None,
        };
        target.derive_from(&source);

        assert_eq!(target.prototype, Some("srd:race:human".to_string()));
        assert_eq!(
            target.get_property("name").and_then(|v| v.as_str()),
            Some("Human")
        );
        assert_eq!(
            target.get_property("size").and_then(|v| v.as_str()),
            Some("Medium")
        );
        assert!(target.tags.contains(&"source:phb".to_string()));
    }
}
