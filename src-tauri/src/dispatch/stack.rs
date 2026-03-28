use std::collections::HashMap;

use crate::entity::{Entity, Value};
use crate::event::Event;
use crate::operation::Operation;
use crate::queue::Changeset;

use super::dispatcher::AppliedOperation;

/// Applies stacked operations according to their stack rules.
pub struct StackApplicator;

impl StackApplicator {
    pub fn apply_additive_op(
        applied: &mut Vec<AppliedOperation>,
        op: &Operation,
        trigger_event: &Event,
        entities: &mut HashMap<String, Entity>,
        changeset: &mut Changeset,
    ) -> Option<Event> {
        let target_id = &op.target;
        if !entities.contains_key(target_id) {
            return None;
        }

        let entity = entities.get_mut(target_id).unwrap();
        let new_value = Self::compute_operation_static(op, trigger_event);

        // Sum all previously applied additive values plus the new one
        let base = applied.iter().filter_map(|a| a.value.as_int()).sum::<i64>();
        let delta = new_value.as_int().unwrap_or(0);
        let total = base + delta;

        let old_value = entity.get_property(&op.path).cloned();
        changeset.add(target_id, &op.path, old_value.clone(), Some(Value::Int(total)));
        entity.set_property(&op.path, Value::Int(total));

        applied.push(AppliedOperation {
            op: op.op.clone(),
            value: new_value,
            source: op.source.clone(),
        });

        None
    }

    pub fn apply_highest_wins_op(
        applied: &mut Vec<AppliedOperation>,
        op: &Operation,
        trigger_event: &Event,
        entities: &mut HashMap<String, Entity>,
        changeset: &mut Changeset,
    ) -> Option<Event> {
        let target_id = &op.target;
        if !entities.contains_key(target_id) {
            return None;
        }

        let entity = entities.get_mut(target_id).unwrap();
        let new_value = Self::compute_operation_static(op, trigger_event);
        let new_int = new_value.as_int().unwrap_or(0);

        let current_int = applied
            .iter()
            .filter_map(|a| a.value.as_int())
            .max()
            .unwrap_or(0);

        let chosen = new_int.max(current_int);
        let old_value = entity.get_property(&op.path).cloned();
        changeset.add(target_id, &op.path, old_value.clone(), Some(Value::Int(chosen)));
        entity.set_property(&op.path, Value::Int(chosen));

        applied.push(AppliedOperation {
            op: op.op.clone(),
            value: new_value,
            source: op.source.clone(),
        });

        None
    }

    pub fn apply_lowest_wins_op(
        applied: &mut Vec<AppliedOperation>,
        op: &Operation,
        trigger_event: &Event,
        entities: &mut HashMap<String, Entity>,
        changeset: &mut Changeset,
    ) -> Option<Event> {
        let target_id = &op.target;
        if !entities.contains_key(target_id) {
            return None;
        }

        let entity = entities.get_mut(target_id).unwrap();
        let new_value = Self::compute_operation_static(op, trigger_event);
        let new_int = new_value.as_int().unwrap_or(0);

        let current_int = applied
            .iter()
            .filter_map(|a| a.value.as_int())
            .min()
            .unwrap_or(i64::MAX);

        let chosen = new_int.min(current_int);
        let old_value = entity.get_property(&op.path).cloned();
        changeset.add(target_id, &op.path, old_value.clone(), Some(Value::Int(chosen)));
        entity.set_property(&op.path, Value::Int(chosen));

        applied.push(AppliedOperation {
            op: op.op.clone(),
            value: new_value,
            source: op.source.clone(),
        });

        None
    }

    pub fn apply_exclusive_op(
        applied: &mut Vec<AppliedOperation>,
        op: &Operation,
        trigger_event: &Event,
        entities: &mut HashMap<String, Entity>,
        changeset: &mut Changeset,
    ) -> Option<Event> {
        let target_id = &op.target;
        if !entities.contains_key(target_id) {
            return None;
        }

        let entity = entities.get_mut(target_id).unwrap();
        let new_value = Self::compute_operation_static(op, trigger_event);

        // Exclusive: most recent wins — clear history and record the new one
        let old_value = entity.get_property(&op.path).cloned();
        changeset.add(target_id, &op.path, old_value, Some(new_value.clone()));
        entity.set_property(&op.path, new_value.clone());

        applied.clear();
        applied.push(AppliedOperation {
            op: op.op.clone(),
            value: new_value,
            source: op.source.clone(),
        });

        None
    }

    fn compute_operation_static(op: &Operation, trigger_event: &Event) -> Value {
        if let Value::Str(ref s) = op.value {
            if s.starts_with('{') && s.ends_with('}') {
                let key = &s[1..s.len() - 1];
                if let Some(val) = trigger_event.payload.get(key) {
                    return val.clone();
                }
            }
        }
        op.value.clone()
    }
}
