use std::collections::HashMap;

use crate::entity::{Entity, EntitySummary, Value};

/// In-memory store for all loaded entities.
pub struct EntityStore {
    entities: HashMap<String, Entity>,
}

impl EntityStore {
    /// Create an empty store.
    pub fn new() -> Self {
        Self {
            entities: HashMap::new(),
        }
    }

    /// Create a store from a pre-loaded entity map.
    pub fn from_entities(entities: HashMap<String, Entity>) -> Self {
        Self { entities }
    }

    /// Get all entities of a given type, sorted alphabetically by name.
    pub fn get_by_type(&self, entity_type: &str) -> Vec<EntitySummary> {
        let mut results: Vec<EntitySummary> = self
            .entities
            .values()
            .filter(|e| e.entity_type == entity_type)
            .map(|e| e.to_summary())
            .collect();
        results.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        results
    }

    /// Get a single entity by its exact id.
    pub fn get_by_id(&self, id: &str) -> Option<&Entity> {
        self.entities.get(id)
    }

    /// Search entities by case-insensitive substring match on name and tags.
    /// Results sorted alphabetically by name.
    pub fn search(&self, query: &str) -> Vec<EntitySummary> {
        let q = query.to_lowercase();
        let mut results: Vec<EntitySummary> = self
            .entities
            .values()
            .filter(|e| {
                let name = match e.properties.get("name") {
                    Some(Value::Str(s)) => s.to_lowercase(),
                    _ => String::new(),
                };
                if name.contains(&q) {
                    return true;
                }
                e.tags.iter().any(|t| t.to_lowercase().contains(&q))
            })
            .map(|e| e.to_summary())
            .collect();
        results.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        results
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pack_loader::load_entities;
    use std::path::PathBuf;

    fn fixtures_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join("test-pack")
    }

    fn test_store() -> EntityStore {
        EntityStore::from_entities(load_entities(&fixtures_dir()))
    }

    #[test]
    fn test_get_by_type() {
        let store = test_store();
        let classes = store.get_by_type("class");
        assert_eq!(classes.len(), 1);
        assert_eq!(classes[0].name, "Fighter");

        let races = store.get_by_type("race");
        assert_eq!(races.len(), 1);
        assert_eq!(races[0].name, "Human");

        let feats = store.get_by_type("feat");
        assert_eq!(feats.len(), 1);
        assert_eq!(feats[0].name, "Power Attack");
    }

    #[test]
    fn test_get_by_type_empty() {
        let store = test_store();
        let spells = store.get_by_type("spell");
        assert!(spells.is_empty());
    }

    #[test]
    fn test_get_by_id() {
        let store = test_store();
        let entity = store.get_by_id("test:class:fighter");
        assert!(entity.is_some());
        assert_eq!(entity.unwrap().entity_type, "class");

        assert!(store.get_by_id("nonexistent").is_none());
    }

    #[test]
    fn test_search_by_name() {
        let store = test_store();
        // "human" only matches the Human race by name (no tag matches)
        let results = store.search("human");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "Human");
    }

    #[test]
    fn test_search_case_insensitive() {
        let store = test_store();
        let results = store.search("HUMAN");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "Human");
    }

    #[test]
    fn test_search_by_tag() {
        let store = test_store();
        // All 3 fixtures have "source:phb" tag
        let results = store.search("source:phb");
        assert_eq!(results.len(), 3);
    }

    #[test]
    fn test_search_by_tag_partial() {
        let store = test_store();
        let results = store.search("combat");
        // Power Attack has "combat" tag
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "Power Attack");
    }

    #[test]
    fn test_search_sorted_alphabetically() {
        let store = test_store();
        let results = store.search("source:phb");
        assert_eq!(results.len(), 3);
        // Should be: Fighter, Human, Power Attack
        assert_eq!(results[0].name, "Fighter");
        assert_eq!(results[1].name, "Human");
        assert_eq!(results[2].name, "Power Attack");
    }

    #[test]
    fn test_search_no_results() {
        let store = test_store();
        let results = store.search("zzzznonexistent");
        assert!(results.is_empty());
    }
}
