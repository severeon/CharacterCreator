//! Read-only queries and entity loading.

use std::collections::HashMap;
use uuid::Uuid;

use crate::entity::{Entity, EntitySummary};
use crate::engine::types::WorkflowStatus;
use crate::engine::Engine;

/// Loads a batch of entities into the engine, indexing their subscriptions.
pub struct LoadEntities;

impl LoadEntities {
    pub fn execute(engine: &mut Engine, entities: HashMap<String, Entity>) {
        for (id, entity) in entities {
            engine.dispatcher.index_entity(&entity);
            engine.entities.insert(id, entity);
        }
    }
}

/// Returns all entities of a given type, sorted alphabetically.
pub struct GetEntitiesByType;

impl GetEntitiesByType {
    pub fn execute(engine: &Engine, entity_type: &str) -> Vec<EntitySummary> {
        let mut results: Vec<EntitySummary> = engine
            .entities
            .values()
            .filter(|e| e.entity_type == entity_type)
            .map(|e| e.to_summary())
            .collect();
        results.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        results
    }
}

/// Returns entities matching a case-insensitive query on name and tags.
pub struct SearchEntities;

impl SearchEntities {
    pub fn execute(engine: &Engine, query: &str) -> Vec<EntitySummary> {
        let q = query.to_lowercase();
        let mut results: Vec<EntitySummary> = engine
            .entities
            .values()
            .filter(|e| {
                let name = match e.properties.get("name") {
                    Some(crate::entity::Value::Str(s)) => s.to_lowercase(),
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

/// Returns all entities of a given slot type (e.g. "race", "class").
pub struct GetAvailableChoices;

impl GetAvailableChoices {
    pub fn execute(engine: &Engine, _character_id: &str, slot_type: &str) -> Vec<Entity> {
        engine
            .entities
            .values()
            .filter(|e| e.entity_type == slot_type)
            .cloned()
            .collect()
    }
}

/// Returns speculative (overlay) state from a specific queue.
pub struct GetSpeculativeState;

impl GetSpeculativeState {
    pub fn execute(engine: &Engine, character_id: &str, queue_id: Option<&str>) -> Option<Entity> {
        let resolved_queue_id = if let Some(qid) = queue_id {
            Uuid::parse_str(qid).ok()
        } else {
            engine.active_queues.get(character_id).copied()
        };

        let queue_id = match resolved_queue_id {
            Some(qid) => qid,
            None => return engine.get_entity(character_id).cloned(),
        };

        let queue = engine.queue_manager.get_queue(&queue_id)?;

        let base = match &queue.snapshot {
            Some(snapshot) => snapshot.entities.get(character_id)?.clone(),
            None => engine.get_entity(character_id)?.clone(),
        };

        let mut result = base;
        for entry in &queue.changeset.entries {
            if entry.entity_id == character_id {
                if let Some(new_val) = &entry.new_value {
                    result.set_property(&entry.path, new_val.clone());
                } else {
                    result.properties.remove(&entry.path);
                }
            }
        }

        Some(result)
    }
}

/// Returns the current workflow status for a character.
pub struct GetWorkflowStatus;

impl GetWorkflowStatus {
    pub fn execute(engine: &Engine, character_id: &str, workflow_id: &str) -> WorkflowStatus {
        let completed = engine
            .completed_workflow_steps
            .get(character_id)
            .cloned()
            .unwrap_or_default();

        let pending = engine.workflow_engine.get_next_steps(
            workflow_id,
            &completed,
            engine.entities.get(character_id).unwrap_or(&Entity {
                id: String::new(),
                entity_type: String::new(),
                properties: std::collections::HashMap::new(),
                tags: vec![],
                mdx_body: String::new(),
                source_pack: String::new(),
                subscriptions: vec![],
                computed_views: vec![],
                prototype: None,
            }),
        );

        WorkflowStatus {
            completed,
            pending,
            available: vec![],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_workflow_status() {
        let engine = Engine::new();
        let status = GetWorkflowStatus::execute(&engine, "char1", "srd:workflow:character_creation");
        assert!(status.completed.is_empty());
        assert!(!status.pending.is_empty());
    }

    #[test]
    fn test_get_speculative_state_from_queue() {
        let mut engine = Engine::new();
        let char_id = crate::engine::character::CreateCharacter::execute(&mut engine, "Thorin");

        let root_id = engine.queue_manager.create_root_queue();
        let queue_id = engine.queue_manager.create_child_queue(root_id).unwrap();

        let timestamp = engine.queue_manager.next_timestamp();
        {
            let queue = engine.queue_manager.get_queue_mut(&queue_id).unwrap();
            queue.take_snapshot(&engine.entities, timestamp);
            queue.record_change(&char_id, "test.prop", None, Some(crate::entity::Value::Int(42)));
        }

        let state = GetSpeculativeState::execute(&engine, &char_id, Some(&queue_id.to_string()));
        assert!(state.is_some());
        assert_eq!(
            state.unwrap().get_property("test.prop"),
            Some(&crate::entity::Value::Int(42))
        );
    }
}
