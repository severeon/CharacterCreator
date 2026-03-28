use std::collections::HashMap;

use crate::entity::{Entity, Value};
use crate::event::Event;
use crate::queue::Changeset;
use crate::subscription::Predicate;

/// Evaluates event predicates against entity state and changeset.
pub struct PredicateEvaluator;

impl PredicateEvaluator {
    /// Returns true if the predicate passes (or is None).
    pub fn evaluate_predicate(
        predicate: &Option<Predicate>,
        event: &Event,
        entities: &HashMap<String, Entity>,
        changeset: &Changeset,
    ) -> bool {
        match predicate {
            None => true,
            Some(p) => Self::evaluate(p, event, entities, changeset),
        }
    }

    pub fn evaluate(
        predicate: &Predicate,
        event: &Event,
        entities: &HashMap<String, Entity>,
        changeset: &Changeset,
    ) -> bool {
        match predicate {
            Predicate::Eq(path, value) => {
                if let Some(v) = Self::get_value(path, event, entities) {
                    v == value
                } else {
                    false
                }
            }
            Predicate::Gt(path, value) => {
                let v = Self::get_value(path, event, entities);
                if let (Some(&Value::Int(a)), Value::Int(b)) = (v.as_ref(), value) {
                    a > b
                } else {
                    false
                }
            }
            Predicate::Lt(path, value) => {
                let v = Self::get_value(path, event, entities);
                if let (Some(&Value::Int(a)), Value::Int(b)) = (v.as_ref(), value) {
                    a < b
                } else {
                    false
                }
            }
            Predicate::Gte(path, value) => {
                let v = Self::get_value(path, event, entities);
                if let (Some(&Value::Int(a)), Value::Int(b)) = (v.as_ref(), value) {
                    a >= b
                } else {
                    false
                }
            }
            Predicate::Lte(path, value) => {
                let v = Self::get_value(path, event, entities);
                if let (Some(&Value::Int(a)), Value::Int(b)) = (v.as_ref(), value) {
                    a <= b
                } else {
                    false
                }
            }
            Predicate::In(path, values) => {
                let v = Self::get_value(path, event, entities);
                if let Some(v) = v {
                    values.iter().any(|val| v == val)
                } else {
                    false
                }
            }
            Predicate::Has(path) => Self::get_value(path, event, entities).is_some(),
            Predicate::Not(p) => !Self::evaluate(p, event, entities, changeset),
            Predicate::And(preds) => preds
                .iter()
                .all(|p| Self::evaluate(p, event, entities, changeset)),
            Predicate::Or(preds) => preds
                .iter()
                .any(|p| Self::evaluate(p, event, entities, changeset)),
            Predicate::EntityHas(entity_id, path) => entities
                .get(entity_id)
                .and_then(|e| e.get_property(path).cloned())
                .is_some(),
            Predicate::InChangeset(path) => changeset.contains_path(path),
            Predicate::PayloadEq(key, value) => {
                event.payload.get(key).map(|v| v == value).unwrap_or(false)
            }
        }
    }

    pub fn get_value<'a>(
        path: &str,
        event: &'a Event,
        entities: &'a HashMap<String, Entity>,
    ) -> Option<&'a Value> {
        if path.starts_with("event.payload.") {
            let key = &path[14..];
            return event.payload.get(key);
        }
        if path.starts_with("event.") {
            return None;
        }
        if let Some(entity_id) = &event.target {
            if let Some(entity) = entities.get(entity_id) {
                return entity.get_property(path);
            }
        }
        None
    }
}
