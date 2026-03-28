use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use crate::entity::{Entity, Value};
use crate::event::Event;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum QueueStatus {
    Pending,
    Processing,
    Committed,
    RolledBack,
}

impl Default for QueueStatus {
    fn default() -> Self {
        QueueStatus::Pending
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateSnapshot {
    pub entities: HashMap<String, Entity>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangesetEntry {
    pub entity_id: String,
    pub path: String,
    pub old_value: Option<Value>,
    pub new_value: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Changeset {
    pub entries: Vec<ChangesetEntry>,
}

impl Changeset {
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
        }
    }

    pub fn add(
        &mut self,
        entity_id: &str,
        path: &str,
        old_value: Option<Value>,
        new_value: Option<Value>,
    ) {
        self.entries.push(ChangesetEntry {
            entity_id: entity_id.to_string(),
            path: path.to_string(),
            old_value,
            new_value,
        });
    }

    pub fn contains_path(&self, path: &str) -> bool {
        self.entries.iter().any(|e| e.path == path)
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

impl Default for Changeset {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Queue {
    pub id: Uuid,
    pub parent: Option<Uuid>,
    pub status: QueueStatus,
    pub events: Vec<Event>,
    pub snapshot: Option<StateSnapshot>,
    pub changeset: Changeset,
    pub created_at: u64,
    pub committed_at: Option<u64>,
}

impl Queue {
    pub fn new(parent: Option<Uuid>, timestamp: u64) -> Self {
        Self {
            id: Uuid::new_v4(),
            parent,
            status: QueueStatus::Pending,
            events: Vec::new(),
            snapshot: None,
            changeset: Changeset::new(),
            created_at: timestamp,
            committed_at: None,
        }
    }

    pub fn start_processing(&mut self) {
        self.status = QueueStatus::Processing;
    }

    pub fn commit(&mut self, timestamp: u64) {
        self.status = QueueStatus::Committed;
        self.committed_at = Some(timestamp);
    }

    pub fn rollback(&mut self) {
        self.status = QueueStatus::RolledBack;
    }

    pub fn push_event(&mut self, event: Event) {
        self.events.push(event);
    }

    pub fn take_snapshot(&mut self, entities: &HashMap<String, Entity>, timestamp: u64) {
        self.snapshot = Some(StateSnapshot {
            entities: entities.clone(),
            timestamp,
        });
    }

    pub fn record_change(
        &mut self,
        entity_id: &str,
        path: &str,
        old_value: Option<Value>,
        new_value: Option<Value>,
    ) {
        self.changeset.add(entity_id, path, old_value, new_value);
    }

    pub fn get_parent(&self) -> Option<Uuid> {
        self.parent
    }

    pub fn is_root(&self) -> bool {
        self.parent.is_none()
    }
}

pub struct QueueManager {
    queues: HashMap<Uuid, Queue>,
    root_queue_id: Option<Uuid>,
    logical_clock: u64,
}

impl QueueManager {
    pub fn new() -> Self {
        Self {
            queues: HashMap::new(),
            root_queue_id: None,
            logical_clock: 0,
        }
    }

    pub fn create_root_queue(&mut self) -> Uuid {
        let queue = Queue::new(None, self.logical_clock);
        let id = queue.id;
        self.queues.insert(id, queue);
        self.root_queue_id = Some(id);
        id
    }

    pub fn create_child_queue(&mut self, parent_id: Uuid) -> Option<Uuid> {
        if !self.queues.contains_key(&parent_id) {
            return None;
        }
        self.logical_clock += 1;
        let queue = Queue::new(Some(parent_id), self.logical_clock);
        let id = queue.id;
        self.queues.insert(id, queue);
        Some(id)
    }

    pub fn get_queue(&self, id: &Uuid) -> Option<&Queue> {
        self.queues.get(id)
    }

    pub fn get_queue_mut(&mut self, id: &Uuid) -> Option<&mut Queue> {
        self.queues.get_mut(id)
    }

    pub fn get_root_queue_id(&self) -> Option<Uuid> {
        self.root_queue_id
    }

    pub fn next_timestamp(&mut self) -> u64 {
        self.logical_clock += 1;
        self.logical_clock
    }

    pub fn advance_clock(&mut self) -> u64 {
        self.next_timestamp()
    }

    pub fn get_all_queues(&self) -> Vec<&Queue> {
        self.queues.values().collect()
    }

    pub fn get_child_queues(&self, parent_id: &Uuid) -> Vec<&Queue> {
        self.queues
            .values()
            .filter(|q| q.parent == Some(*parent_id))
            .collect()
    }

    pub fn commit_queue(&mut self, queue_id: &Uuid) -> Option<&Changeset> {
        if let Some(queue) = self.queues.get_mut(queue_id) {
            queue.commit(self.logical_clock);
            self.logical_clock += 1;
            Some(&queue.changeset)
        } else {
            None
        }
    }

    pub fn rollback_queue(&mut self, queue_id: &Uuid) -> bool {
        if let Some(queue) = self.queues.get_mut(queue_id) {
            queue.rollback();
            true
        } else {
            false
        }
    }
}

impl Default for QueueManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_queue_creation() {
        let mut manager = QueueManager::new();
        let root_id = manager.create_root_queue();
        assert!(manager.get_queue(&root_id).is_some());

        let child_id = manager.create_child_queue(root_id).unwrap();
        let child = manager.get_queue(&child_id).unwrap();
        assert_eq!(child.parent, Some(root_id));
        assert_eq!(child.status, QueueStatus::Pending);
    }

    #[test]
    fn test_queue_commit() {
        let mut manager = QueueManager::new();
        let queue_id = manager.create_root_queue();
        {
            let queue = manager.get_queue(&queue_id).unwrap();
            assert_eq!(queue.status, QueueStatus::Pending);
        }
        manager.commit_queue(&queue_id);
        let queue = manager.get_queue(&queue_id).unwrap();
        assert_eq!(queue.status, QueueStatus::Committed);
    }

    #[test]
    fn test_queue_rollback() {
        let mut manager = QueueManager::new();
        let queue_id = manager.create_root_queue();
        manager.rollback_queue(&queue_id);
        let queue = manager.get_queue(&queue_id).unwrap();
        assert_eq!(queue.status, QueueStatus::RolledBack);
    }

    #[test]
    fn test_changeset() {
        let mut changeset = Changeset::new();
        changeset.add(
            "char1",
            "abilities.strength.score",
            Some(Value::Int(10)),
            Some(Value::Int(16)),
        );
        changeset.add(
            "char1",
            "abilities.strength.modifier",
            Some(Value::Int(0)),
            Some(Value::Int(3)),
        );

        assert!(changeset.contains_path("abilities.strength.score"));
        assert!(changeset.contains_path("abilities.strength.modifier"));
        assert!(!changeset.contains_path("abilities.dex.score"));
        assert_eq!(changeset.entries.len(), 2);
    }

    #[test]
    fn test_logical_clock() {
        let mut manager = QueueManager::new();
        let t1 = manager.next_timestamp();
        let t2 = manager.next_timestamp();
        let t3 = manager.advance_clock();
        assert!(t3 > t2);
        assert!(t2 > t1);
    }
}
