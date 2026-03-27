use std::collections::HashMap;
use uuid::Uuid;

use crate::dispatch::Dispatcher;
use crate::entity::{Entity, EntitySummary, Value};
use crate::event::EventBuilder;
use crate::queue::{Changeset, QueueManager};
use crate::workflow::{create_character_creation_workflow, WorkflowEngine};

pub struct Engine {
    entities: HashMap<String, Entity>,
    queue_manager: QueueManager,
    dispatcher: Dispatcher,
    workflow_engine: WorkflowEngine,
    active_character_id: Option<String>,
    completed_workflow_steps: HashMap<String, Vec<String>>,
    active_queues: HashMap<String, Uuid>,
}

impl Engine {
    pub fn new() -> Self {
        let mut engine = Self {
            entities: HashMap::new(),
            queue_manager: QueueManager::new(),
            dispatcher: Dispatcher::new(),
            workflow_engine: WorkflowEngine::new(),
            active_character_id: None,
            completed_workflow_steps: HashMap::new(),
            active_queues: HashMap::new(),
        };
        engine
            .workflow_engine
            .register(create_character_creation_workflow());
        engine
    }

    pub fn load_entities(&mut self, entities: HashMap<String, Entity>) {
        for (id, entity) in entities {
            self.entities.insert(id, entity);
        }
    }

    pub fn get_entity(&self, id: &str) -> Option<&Entity> {
        self.entities.get(id)
    }

    pub fn get_entity_mut(&mut self, id: &str) -> Option<&mut Entity> {
        self.entities.get_mut(id)
    }

    pub fn create_character(&mut self, name: &str) -> String {
        let id = Uuid::new_v4().to_string();
        let character = Entity {
            id: id.clone(),
            entity_type: "character".to_string(),
            properties: {
                let mut props = HashMap::new();
                props.insert("name".to_string(), Value::Str(name.to_string()));
                props
            },
            tags: vec![],
            mdx_body: String::new(),
            source_pack: "creation".to_string(),
            subscriptions: vec![],
            computed_views: vec![],
            prototype: None,
        };
        self.entities.insert(id.clone(), character);
        self.active_character_id = Some(id.clone());
        id
    }

    pub fn select_race(&mut self, character_id: &str, race_id: &str) -> Result<(), String> {
        let race = self
            .entities
            .get(race_id)
            .ok_or_else(|| format!("Race not found: {}", race_id))?
            .clone();

        {
            let character = self
                .entities
                .get_mut(character_id)
                .ok_or_else(|| format!("Character not found: {}", character_id))?;

            character
                .properties
                .insert("race".to_string(), Value::Str(race_id.to_string()));
            if let Some(name) = race.properties.get("name").cloned() {
                character.properties.insert("race_name".to_string(), name);
            }
            if let Some(size) = race.properties.get("size").cloned() {
                character.properties.insert("size".to_string(), size);
            }
            if let Some(speed) = race.properties.get("speed").cloned() {
                character.properties.insert("speed".to_string(), speed);
            }
        }

        let timestamp = self.queue_manager.next_timestamp();
        let queue_id = self.queue_manager.create_root_queue();

        let event = EventBuilder::new("race.selected", race_id, queue_id, timestamp)
            .target(character_id)
            .payload("race_id", Value::Str(race_id.to_string()))
            .build();

        let mut changeset = Changeset::new();
        self.dispatcher.dispatch(
            &event,
            &mut self.entities,
            &self.queue_manager,
            &mut changeset,
        );

        self.queue_manager.commit_queue(&queue_id);

        self.completed_workflow_steps
            .entry(character_id.to_string())
            .or_insert_with(Vec::new)
            .push("select-race".to_string());

        Ok(())
    }

    pub fn select_class(
        &mut self,
        character_id: &str,
        class_id: &str,
        level: i32,
    ) -> Result<(), String> {
        let class_entity = self
            .entities
            .get(class_id)
            .ok_or_else(|| format!("Class not found: {}", class_id))?
            .clone();

        {
            let character = self
                .entities
                .get_mut(character_id)
                .ok_or_else(|| format!("Character not found: {}", character_id))?;

            character
                .properties
                .insert("class".to_string(), Value::Str(class_id.to_string()));
            character.properties.insert(
                "class_name".to_string(),
                class_entity
                    .properties
                    .get("name")
                    .cloned()
                    .unwrap_or(Value::Str(class_id.to_string())),
            );
            character
                .properties
                .insert("level".to_string(), Value::Int(level as i64));

            if let Some(hd) = class_entity.properties.get("hd").cloned() {
                character.properties.insert("hit_die".to_string(), hd);
            }
            if let Some(bab) = class_entity.properties.get("bab").cloned() {
                character
                    .properties
                    .insert("base_attack_bonus".to_string(), bab);
            }
            if let Some(sp) = class_entity.properties.get("skill_points").cloned() {
                character
                    .properties
                    .insert("skill_points_per_level".to_string(), sp);
            }
        }

        let timestamp = self.queue_manager.next_timestamp();
        let queue_id = self.queue_manager.create_root_queue();

        let event = EventBuilder::new("class.selected", class_id, queue_id, timestamp)
            .target(character_id)
            .payload("class_id", Value::Str(class_id.to_string()))
            .payload("level", Value::Int(level as i64))
            .build();

        let mut changeset = Changeset::new();
        self.dispatcher.dispatch(
            &event,
            &mut self.entities,
            &self.queue_manager,
            &mut changeset,
        );

        self.queue_manager.commit_queue(&queue_id);

        self.completed_workflow_steps
            .entry(character_id.to_string())
            .or_insert_with(Vec::new)
            .push("select-class".to_string());

        Ok(())
    }

    pub fn assign_ability_scores(
        &mut self,
        character_id: &str,
        scores: HashMap<String, i64>,
    ) -> Result<(), String> {
        let character = self
            .entities
            .get_mut(character_id)
            .ok_or_else(|| format!("Character not found: {}", character_id))?;

        for (ability, score) in scores {
            let path = format!("abilities.{}.score", ability);
            character.set_property(&path, Value::Int(score));

            let mod_path = format!("abilities.{}.modifier", ability);
            let modifier = (score - 10) / 2;
            character.set_property(&mod_path, Value::Int(modifier));
        }

        Ok(())
    }

    pub fn get_available_choices(&self, _character_id: &str, slot_type: &str) -> Vec<Entity> {
        self.entities
            .values()
            .filter(|e| e.entity_type == slot_type)
            .cloned()
            .collect()
    }

    pub fn get_entities_by_type(&self, entity_type: &str) -> Vec<EntitySummary> {
        let mut results: Vec<EntitySummary> = self
            .entities
            .values()
            .filter(|e| e.entity_type == entity_type)
            .map(|e| e.to_summary())
            .collect();
        results.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        results
    }

    pub fn search_entities(&self, query: &str) -> Vec<EntitySummary> {
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

    /// Returns the speculative state of a character entity.
    /// If queue_id is provided, returns snapshot + changeset overlay from that queue.
    /// Otherwise, uses the active queue for this character, or falls back to committed state.
    pub fn get_speculative_state(&self, character_id: &str, queue_id: Option<&str>) -> Option<Entity> {
        let resolved_queue_id = if let Some(qid) = queue_id {
            Uuid::parse_str(qid).ok()
        } else {
            self.active_queues.get(character_id).copied()
        };

        let queue_id = match resolved_queue_id {
            Some(qid) => qid,
            None => return self.get_entity(character_id).cloned(),
        };

        let queue = self.queue_manager.get_queue(&queue_id)?;

        // Start from snapshot if available
        let base = match &queue.snapshot {
            Some(snapshot) => snapshot.entities.get(character_id)?.clone(),
            None => self.get_entity(character_id)?.clone(),
        };

        // Overlay changeset entries for this character
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

    pub fn get_workflow_status(&self, character_id: &str, workflow_id: &str) -> WorkflowStatus {
        let completed = self
            .completed_workflow_steps
            .get(character_id)
            .cloned()
            .unwrap_or_default();

        let pending = self.workflow_engine.get_next_steps(
            workflow_id,
            &completed,
            self.entities.get(character_id).unwrap_or(&Entity {
                id: String::new(),
                entity_type: String::new(),
                properties: HashMap::new(),
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

impl Default for Engine {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct WorkflowStatus {
    pub completed: Vec<String>,
    pub pending: Vec<String>,
    pub available: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_engine_create_character() {
        let mut engine = Engine::new();
        let id = engine.create_character("Thorin");
        assert!(!id.is_empty());

        let character = engine.get_entity(&id).unwrap();
        assert_eq!(
            character.properties.get("name"),
            Some(&Value::Str("Thorin".to_string()))
        );
    }

    #[test]
    fn test_engine_assign_ability_scores() {
        let mut engine = Engine::new();
        let id = engine.create_character("Thorin");

        let mut scores = HashMap::new();
        scores.insert("strength".to_string(), 16);
        scores.insert("dexterity".to_string(), 14);

        engine.assign_ability_scores(&id, scores).unwrap();

        let character = engine.get_entity(&id).unwrap();
        assert_eq!(
            character.get_property("abilities.strength.score"),
            Some(&Value::Int(16))
        );
        assert_eq!(
            character.get_property("abilities.strength.modifier"),
            Some(&Value::Int(3))
        );
        assert_eq!(
            character.get_property("abilities.dexterity.score"),
            Some(&Value::Int(14))
        );
        assert_eq!(
            character.get_property("abilities.dexterity.modifier"),
            Some(&Value::Int(2))
        );
    }

    #[test]
    fn test_workflow_status() {
        let engine = Engine::new();
        let status = engine.get_workflow_status("char1", "srd:workflow:character_creation");
        assert!(status.completed.is_empty());
        assert!(!status.pending.is_empty());
    }

    #[test]
    fn test_get_speculative_state_from_queue() {
        let mut engine = Engine::new();
        let char_id = engine.create_character("Thorin");

        // Create root queue and a child queue
        let root_id = engine.queue_manager.create_root_queue();
        let queue_id = engine.queue_manager.create_child_queue(root_id).unwrap();

        // Take snapshot and then record a change in the queue's changeset
        let timestamp = engine.queue_manager.next_timestamp();
        {
            let queue = engine.queue_manager.get_queue_mut(&queue_id).unwrap();
            queue.take_snapshot(&engine.entities, timestamp);
            // Record the change so it appears in the changeset overlay
            queue.record_change(&char_id, "test.prop", None, Some(Value::Int(42)));
        }

        // Get speculative state from queue (should reflect snapshot + changeset overlay)
        let state = engine.get_speculative_state(&char_id, Some(&queue_id.to_string()));
        assert!(state.is_some());
        assert_eq!(state.unwrap().get_property("test.prop"), Some(&Value::Int(42)));
    }
}
