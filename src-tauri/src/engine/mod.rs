//! Arcanum Engine — character creation and event-sourced state management.
//!
//! Split into modules under 200 LOC each:
//! - `error.rs`   — EngineError typed error enum
//! - `settings.rs` — DMSettings (DM configuration)
//! - `types.rs`   — WorkflowStatus and other shared types
//! - `character.rs` — Character creation and identity
//! - `selection.rs` — Race and class selection
//! - `abilities.rs` — Ability score assignment
//! - `skills.rs`   — Skill point allocation
//! - `feats.rs`    — Feat selection
//! - `export.rs`   — Character export (JSON / Markdown)
//! - `query.rs`    — Read-only queries (entities, search, speculative state)
//! - `tests.rs`    — Unit tests

pub mod abilities;
pub mod character;
pub mod error;
pub mod export;
pub mod feats;
pub mod query;
pub mod selection;
pub mod settings;
pub mod skills;
pub mod types;
#[cfg(test)]
mod tests;

pub use error::EngineError;
pub use settings::{DmSettings, DMSettings};
pub use types::WorkflowStatus;

use std::collections::HashMap;

use crate::dispatch::Dispatcher;
use crate::entity::{Entity, Value};
use crate::event::EventBuilder;
use crate::queue::{Changeset, QueueManager};
use crate::workflow::{create_character_creation_workflow, WorkflowEngine};

/// The Arcanum game engine — holds all entities, queues, and workflow state.
pub struct Engine {
    pub(crate) entities: HashMap<String, Entity>,
    pub(crate) queue_manager: QueueManager,
    pub(crate) dispatcher: Dispatcher,
    pub(crate) workflow_engine: WorkflowEngine,
    pub(crate) active_character_id: Option<String>,
    pub(crate) completed_workflow_steps: HashMap<String, Vec<String>>,
    pub(crate) active_queues: HashMap<String, uuid::Uuid>,
    pub(crate) dm_settings: DMSettings,
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
            dm_settings: DMSettings::default(),
        };
        engine
            .workflow_engine
            .register(create_character_creation_workflow());
        engine
    }

    pub fn get_dm_settings(&self) -> DMSettings {
        self.dm_settings.clone()
    }

    pub fn set_dm_settings(&mut self, settings: DMSettings) {
        self.dm_settings = settings;
    }

    pub fn get_entity(&self, id: &str) -> Option<&Entity> {
        self.entities.get(id)
    }

    /// Loads entities into the engine, indexing their subscriptions.
    pub fn load_entities(&mut self, entities: HashMap<String, Entity>) {
        for (id, entity) in entities {
            self.dispatcher.index_entity(&entity);
            self.entities.insert(id, entity);
        }
    }

    /// Emit an event and commit a root queue.
    pub(crate) fn emit_event(
        &mut self,
        character_id: &str,
        event_type: &str,
        payload: HashMap<String, Value>,
    ) -> Result<(), EngineError> {
        let timestamp = self.queue_manager.next_timestamp();
        let queue_id = self.queue_manager.create_root_queue();

        let mut event = EventBuilder::new(event_type, character_id, queue_id, timestamp)
            .target(character_id);
        for (k, v) in payload {
            event = event.payload(&k, v);
        }
        let event = event.build();

        let mut changeset = Changeset::new();
        self.dispatcher.dispatch(
            &event,
            &mut self.entities,
            &self.queue_manager,
            &mut changeset,
        );
        self.queue_manager.commit_queue(&queue_id);
        Ok(())
    }

    pub(crate) fn complete_workflow_step(&mut self, character_id: &str, step: &str) {
        self.completed_workflow_steps
            .entry(character_id.to_string())
            .or_insert_with(Vec::new)
            .push(step.to_string());
    }
}

impl Default for Engine {
    fn default() -> Self {
        Self::new()
    }
}
