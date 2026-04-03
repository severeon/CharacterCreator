use std::collections::HashMap;

use crate::entity::{Entity, Value};
use crate::event::Event;
use crate::operation::{OpCode, Operation, StackRule};
use crate::queue::{Changeset, QueueManager};
use crate::subscription::Subscription;

use super::predicate::PredicateEvaluator;
use super::stack::StackApplicator;

pub struct Dispatcher {
    subscription_index: HashMap<String, Vec<SubscriptionIndexEntry>>,
    /// Tracks applied operations per path, keyed as "target::path" or
    /// "target::path::group_name" for Named stack rules.
    applied_operations: HashMap<String, Vec<AppliedOperation>>,
}

#[derive(Debug, Clone)]
pub struct AppliedOperation {
    #[allow(dead_code)]
    pub op: OpCode,
    pub value: Value,
    #[allow(dead_code)]
    pub source: String,
}

#[derive(Clone)]
struct SubscriptionIndexEntry {
    subscription: Subscription,
    priority: i32,
}

#[allow(dead_code)]
impl Dispatcher {
    pub fn new() -> Self {
        Self {
            subscription_index: HashMap::new(),
            applied_operations: HashMap::new(),
        }
    }

    /// Clears all applied operation history (useful for resetting between test
    /// scenarios).
    pub fn clear_applied_operations(&mut self) {
        self.applied_operations.clear();
    }

    pub fn index_entity(&mut self, entity: &Entity) {
        for subscription in &entity.subscriptions {
            let entry = SubscriptionIndexEntry {
                subscription: subscription.clone(),
                priority: subscription.priority,
            };
            self.subscription_index
                .entry(subscription.trigger.clone())
                .or_insert_with(Vec::new)
                .push(entry);
        }
        for entry in self.subscription_index.values_mut() {
            entry.sort_by(|a, b| b.priority.cmp(&a.priority));
        }
    }

    pub fn clear_index(&mut self) {
        self.subscription_index.clear();
        self.applied_operations.clear();
    }

    pub fn dispatch(
        &mut self,
        event: &Event,
        entities: &mut HashMap<String, Entity>,
        queue_manager: &QueueManager,
        changeset: &mut Changeset,
    ) -> Vec<Event> {
        let mut generated_events = Vec::new();
        let trigger = &event.event_type;

        if let Some(entries) = self.subscription_index.get(trigger) {
            let entries: Vec<_> = entries.to_vec();
            for entry in entries {
                if PredicateEvaluator::evaluate_predicate(
                    &entry.subscription.predicate,
                    event,
                    entities,
                    changeset,
                ) {
                    for effect in &entry.subscription.effects {
                        if let Some(new_event) =
                            self.apply_stacked_op(effect, event, entities, changeset, queue_manager)
                        {
                            generated_events.push(new_event);
                        }
                    }
                }
            }
        }

        // Also check target entity's direct subscriptions (those not indexed via index_entity)
        if let Some(target_id) = &event.target {
            if let Some(entity) = entities.get(target_id) {
                let direct_subs: Vec<_> = entity
                    .subscriptions
                    .iter()
                    .filter(|s| s.trigger == *trigger)
                    .cloned()
                    .collect();
                for subscription in direct_subs {
                    if PredicateEvaluator::evaluate_predicate(
                        &subscription.predicate,
                        event,
                        entities,
                        changeset,
                    ) {
                        for effect in &subscription.effects {
                            if let Some(new_event) =
                                self.apply_stacked_op(effect, event, entities, changeset, queue_manager)
                            {
                                generated_events.push(new_event);
                            }
                        }
                    }
                }
            }
        }

        // Evaluate ComputedViews on the target entity whose inputs changed
        if let Some(target_id) = &event.target {
            if let Some(entity) = entities.get(target_id) {
                let changed_paths: Vec<String> = changeset
                    .entries
                    .iter()
                    .filter(|e| &e.entity_id == target_id)
                    .map(|e| e.path.clone())
                    .collect();

                let matching_views: Vec<_> = entity
                    .computed_views
                    .iter()
                    .filter(|view| view.inputs.iter().any(|input| changed_paths.contains(input)))
                    .cloned()
                    .collect();

                if !matching_views.is_empty() {
                    if let Some(target) = entities.get_mut(target_id) {
                        for view in matching_views {
                            if let Some(result) = view.computation.evaluate(target) {
                                let old_value = target.get_property(&view.path).cloned();
                                changeset.add(target_id, &view.path, old_value.clone(), Some(result.clone()));
                                target.set_property(&view.path, result);
                            }
                        }
                    }
                }
            }
        }

        generated_events
    }

    pub fn apply_operation(
        &mut self,
        op: &Operation,
        trigger_event: &Event,
        entities: &mut HashMap<String, Entity>,
        changeset: &mut Changeset,
        _queue_manager: &QueueManager,
    ) -> Option<Event> {
        let target_id = &op.target;
        if !entities.contains_key(target_id) {
            return None;
        }

        let entity = entities.get_mut(target_id).unwrap();
        let old_value = entity.get_property(&op.path).cloned();

        let new_value = self.compute_operation(op, trigger_event);

        match op.op {
            OpCode::Set => {
                changeset.add(target_id, &op.path, old_value, Some(new_value.clone()));
                entity.set_property(&op.path, new_value);
            }
            OpCode::Add => {
                if let (Some(Value::Int(old)), Value::Int(delta)) =
                    (old_value.clone(), new_value.clone())
                {
                    changeset.add(
                        target_id,
                        &op.path,
                        old_value.clone(),
                        Some(Value::Int(old + delta)),
                    );
                    entity.set_property(&op.path, Value::Int(old + delta));
                }
            }
            OpCode::Sub => {
                if let (Some(Value::Int(old)), Value::Int(delta)) =
                    (old_value.clone(), new_value.clone())
                {
                    changeset.add(
                        target_id,
                        &op.path,
                        old_value.clone(),
                        Some(Value::Int(old - delta)),
                    );
                    entity.set_property(&op.path, Value::Int(old - delta));
                }
            }
            OpCode::Multiply => {
                if let (Some(Value::Int(old)), Value::Int(delta)) =
                    (old_value.clone(), new_value.clone())
                {
                    changeset.add(
                        target_id,
                        &op.path,
                        old_value.clone(),
                        Some(Value::Int(old * delta)),
                    );
                    entity.set_property(&op.path, Value::Int(old * delta));
                }
            }
            OpCode::Grant => {
                changeset.add(target_id, &op.path, old_value, Some(new_value.clone()));
                entity.set_property(&op.path, new_value);
            }
            OpCode::Revoke => {
                changeset.add(target_id, &op.path, old_value, None);
                entity.properties.remove(&op.path);
            }
            OpCode::Push => {
                if let Some(list) = old_value.and_then(|v| v.as_list().cloned()) {
                    let old_list = list.clone();
                    let mut new_list = list;
                    new_list.push(new_value.clone());
                    changeset.add(
                        target_id,
                        &op.path,
                        Some(Value::List(old_list)),
                        Some(Value::List(new_list.clone())),
                    );
                    entity.set_property(&op.path, Value::List(new_list));
                }
            }
            OpCode::Pop => {
                if let Some(Value::List(mut list)) = old_value {
                    if !list.is_empty() {
                        list.pop();
                        changeset.add(
                            target_id,
                            &op.path,
                            Some(Value::List(list.clone())),
                            Some(Value::List(list.clone())),
                        );
                        entity.set_property(&op.path, Value::List(list));
                    }
                }
            }
            OpCode::Clear => {
                changeset.add(target_id, &op.path, old_value, None);
                entity.properties.remove(&op.path);
            }
        }

        None
    }

    pub fn apply_stacked_op(
        &mut self,
        op: &Operation,
        trigger_event: &Event,
        entities: &mut HashMap<String, Entity>,
        changeset: &mut Changeset,
        queue_manager: &QueueManager,
    ) -> Option<Event> {
        match &op.stack_rule {
            None => {
                self.apply_operation(op, trigger_event, entities, changeset, queue_manager)
            }
            Some(rule) => {
                let key = self.stack_key(op, rule);
                // Ensure the key exists before borrowing mutably
                if !self.applied_operations.contains_key(&key) {
                    self.applied_operations.insert(key.clone(), Vec::new());
                }
                let applied = self.applied_operations.get_mut(&key).unwrap();

                match rule {
                    StackRule::Additive => {
                        StackApplicator::apply_additive_op(applied, op, trigger_event, entities, changeset)
                    }
                    StackRule::HighestWins => {
                        StackApplicator::apply_highest_wins_op(applied, op, trigger_event, entities, changeset)
                    }
                    StackRule::LowestWins => {
                        StackApplicator::apply_lowest_wins_op(applied, op, trigger_event, entities, changeset)
                    }
                    StackRule::Exclusive => {
                        StackApplicator::apply_exclusive_op(applied, op, trigger_event, entities, changeset)
                    }
                    StackRule::Named(_) => {
                        // Named: HighestWins within each group, additive across groups.
                        // We need to own the Vec to avoid holding a &mut borrow of self
                        // while scanning other groups. Take it out of the map, do everything,
                        // then reinsert.
                        let target_id = &op.target;
                        if !entities.contains_key(target_id) {
                            return None;
                        }

                        let new_value = Self::compute_operation_static(op, trigger_event);
                        let new_int = new_value.as_int().unwrap_or(0);

                        // Take the group's applied list out of the map
                        let key = self.stack_key(op, rule);
                        let mut applied_owned = self.applied_operations.remove(&key).unwrap_or_default();
                        let group_str = match rule {
                            StackRule::Named(g) => g.clone(),
                            _ => unreachable!(),
                        };

                        let current_int = applied_owned
                            .iter()
                            .filter_map(|a| a.value.as_int())
                            .max()
                            .unwrap_or(0);

                        let chosen = new_int.max(current_int);

                        // Sum the highest value from every Named group for this target+path.
                        let base_key = format!("{}::{}", target_id, op.path);
                        let mut total = chosen;
                        for (other_key, other_applied) in &self.applied_operations {
                            if other_key.starts_with(&base_key) && other_key != &format!("{}::{}", base_key, group_str) {
                                if let Some(group_max) = other_applied
                                    .iter()
                                    .filter_map(|a| a.value.as_int())
                                    .max()
                                {
                                    total += group_max;
                                }
                            }
                        }

                        let entity = entities.get_mut(target_id).unwrap();
                        let old_value = entity.get_property(&op.path).cloned();
                        changeset.add(target_id, &op.path, old_value, Some(Value::Int(total)));
                        entity.set_property(&op.path, Value::Int(total));

                        applied_owned.push(AppliedOperation {
                            op: op.op.clone(),
                            value: new_value,
                            source: op.source.clone(),
                        });

                        // Reinsert the modified list
                        self.applied_operations.insert(key, applied_owned);

                        None
                    }
                }
            }
        }
    }

    /// Returns the key used to group operations in `applied_operations`.
    /// For Named rules, the group name is appended so operations in different
    /// groups do not interfere with each other.
    pub fn stack_key(&self, op: &Operation, rule: &StackRule) -> String {
        match rule {
            StackRule::Named(group) => format!("{}::{}::{}", op.target, op.path, group),
            _ => format!("{}::{}", op.target, op.path),
        }
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

    fn compute_operation(&self, op: &Operation, trigger_event: &Event) -> Value {
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

impl Default for Dispatcher {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entity::Entity;
    use crate::operation::{OpCode, Operation};

    fn make_entity(id: &str) -> Entity {
        Entity {
            id: id.to_string(),
            entity_type: "test".to_string(),
            properties: std::collections::HashMap::new(),
            tags: vec![],
            mdx_body: String::new(),
            source_pack: "test".to_string(),
            subscriptions: vec![],
            computed_views: vec![],
            prototype: None,
        }
    }

    #[test]
    fn test_clear_applied_operations() {
        let mut dispatcher = Dispatcher::new();
        let op = Operation::new(OpCode::Set, "e1", "hp", crate::entity::Value::Int(10), "src");
        let rule = crate::operation::StackRule::Additive;
        let key = dispatcher.stack_key(&op, &rule);
        dispatcher.applied_operations.insert(key, vec![AppliedOperation { value: crate::entity::Value::Int(10), op: OpCode::Set, source: "src".to_string() }]);

        assert!(!dispatcher.applied_operations.is_empty());
        dispatcher.clear_applied_operations();
        assert!(dispatcher.applied_operations.is_empty());
    }

    #[test]
    fn test_clear_index() {
        let mut dispatcher = Dispatcher::new();
        let mut entity = make_entity("e1");
        entity.subscriptions.push(crate::subscription::Subscription {
            id: uuid::Uuid::new_v4(),
            trigger: "test.event".to_string(),
            predicate: None,
            json_predicate: None,
            effects: vec![],
            priority: 50,
            source: "test".to_string(),
        });
        dispatcher.index_entity(&entity);
        assert!(!dispatcher.subscription_index.is_empty());

        dispatcher.clear_index();
        assert!(dispatcher.subscription_index.is_empty());
        assert!(dispatcher.applied_operations.is_empty());
    }
}
