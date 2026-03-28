use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use crate::entity::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: Uuid,
    pub event_type: String,
    pub source: String,
    pub target: Option<String>,
    pub payload: HashMap<String, Value>,
    pub depth: u32,
    pub queue_id: Uuid,
    pub timestamp: u64,
}

impl Event {
    pub fn new(event_type: &str, source: &str, queue_id: Uuid, timestamp: u64) -> Self {
        Self {
            id: Uuid::new_v4(),
            event_type: event_type.to_string(),
            source: source.to_string(),
            target: None,
            payload: HashMap::new(),
            depth: 0,
            queue_id,
            timestamp,
        }
    }

    pub fn with_target(mut self, target: &str) -> Self {
        self.target = Some(target.to_string());
        self
    }

    pub fn with_payload(mut self, key: &str, value: Value) -> Self {
        self.payload.insert(key.to_string(), value);
        self
    }

    pub fn with_depth(mut self, depth: u32) -> Self {
        self.depth = depth;
        self
    }

    pub fn get_payload(&self, key: &str) -> Option<&Value> {
        self.payload.get(key)
    }
}

pub struct EventBuilder {
    event: Event,
}

impl EventBuilder {
    pub fn new(event_type: &str, source: &str, queue_id: Uuid, timestamp: u64) -> Self {
        Self {
            event: Event::new(event_type, source, queue_id, timestamp),
        }
    }

    pub fn target(mut self, target: &str) -> Self {
        self.event.target = Some(target.to_string());
        self
    }

    pub fn payload(mut self, key: &str, value: Value) -> Self {
        self.event.payload.insert(key.to_string(), value);
        self
    }

    pub fn depth(mut self, depth: u32) -> Self {
        self.event.depth = depth;
        self
    }

    pub fn build(self) -> Event {
        self.event
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_new() {
        let queue_id = Uuid::new_v4();
        let event = Event::new("character.creation.started", "engine", queue_id, 1);
        assert_eq!(event.event_type, "character.creation.started");
        assert_eq!(event.source, "engine");
        assert!(event.target.is_none());
        assert!(event.payload.is_empty());
    }

    #[test]
    fn test_event_builder() {
        let queue_id = Uuid::new_v4();
        let event = EventBuilder::new("race.selected", "srd:race:human", queue_id, 2)
            .target("character-123")
            .payload("race_id", Value::Str("human".to_string()))
            .payload("size", Value::Str("medium".to_string()))
            .depth(1)
            .build();
        assert_eq!(event.event_type, "race.selected");
        assert_eq!(event.target, Some("character-123".to_string()));
        assert_eq!(event.payload.len(), 2);
        assert_eq!(event.depth, 1);
    }

    #[test]
    fn test_event_get_payload() {
        let queue_id = Uuid::new_v4();
        let event = Event::new("test", "source", queue_id, 1).with_payload("key1", Value::Int(42));
        assert_eq!(event.get_payload("key1"), Some(&Value::Int(42)));
        assert_eq!(event.get_payload("missing"), None);
    }
}
