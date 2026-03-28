use std::collections::HashMap;

use crate::computed_view::{Computation, ComputedView};
use crate::entity::{Entity, Value};
use crate::event::Event;
use crate::operation::{OpCode, Operation, StackRule};
use crate::queue::{Changeset, QueueManager};
use crate::subscription::{Predicate, Subscription};

pub struct Dispatcher {
    subscription_index: HashMap<String, Vec<SubscriptionIndexEntry>>,
    /// Tracks applied operations per path, keyed as "target::path" or
    /// "target::path::group_name" for Named stack rules.
    applied_operations: HashMap<String, Vec<AppliedOperation>>,
}

#[derive(Debug, Clone)]
pub struct AppliedOperation {
    pub op: OpCode,
    pub value: Value,
    pub source: String,
}

#[derive(Clone)]
struct SubscriptionIndexEntry {
    subscription: Subscription,
    priority: i32,
}

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
                if self.evaluate_predicate(
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
                    if self.evaluate_predicate(
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

    fn evaluate_predicate(
        &self,
        predicate: &Option<Predicate>,
        event: &Event,
        entities: &HashMap<String, Entity>,
        changeset: &Changeset,
    ) -> bool {
        match predicate {
            None => true,
            Some(p) => self.evaluate(p, event, entities, changeset),
        }
    }

    fn evaluate(
        &self,
        predicate: &Predicate,
        event: &Event,
        entities: &HashMap<String, Entity>,
        changeset: &Changeset,
    ) -> bool {
        match predicate {
            Predicate::Eq(path, value) => {
                if let Some(v) = self.get_value(path, event, entities) {
                    v == value
                } else {
                    false
                }
            }
            Predicate::Gt(path, value) => {
                let v = self.get_value(path, event, entities);
                if let (Some(&Value::Int(a)), Value::Int(b)) = (v.as_ref(), value) {
                    a > b
                } else {
                    false
                }
            }
            Predicate::Lt(path, value) => {
                let v = self.get_value(path, event, entities);
                if let (Some(&Value::Int(a)), Value::Int(b)) = (v.as_ref(), value) {
                    a < b
                } else {
                    false
                }
            }
            Predicate::Gte(path, value) => {
                let v = self.get_value(path, event, entities);
                if let (Some(&Value::Int(a)), Value::Int(b)) = (v.as_ref(), value) {
                    a >= b
                } else {
                    false
                }
            }
            Predicate::Lte(path, value) => {
                let v = self.get_value(path, event, entities);
                if let (Some(&Value::Int(a)), Value::Int(b)) = (v.as_ref(), value) {
                    a <= b
                } else {
                    false
                }
            }
            Predicate::In(path, values) => {
                let v = self.get_value(path, event, entities);
                if let Some(v) = v {
                    values.iter().any(|val| v == val)
                } else {
                    false
                }
            }
            Predicate::Has(path) => self.get_value(path, event, entities).is_some(),
            Predicate::Not(p) => !self.evaluate(p, event, entities, changeset),
            Predicate::And(preds) => preds
                .iter()
                .all(|p| self.evaluate(p, event, entities, changeset)),
            Predicate::Or(preds) => preds
                .iter()
                .any(|p| self.evaluate(p, event, entities, changeset)),
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

    fn get_value<'a>(
        &'a self,
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

    fn apply_operation(
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

    fn apply_stacked_op(
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
                        Self::apply_additive_op(applied, op, trigger_event, entities, changeset)
                    }
                    StackRule::HighestWins => {
                        Self::apply_highest_wins_op(applied, op, trigger_event, entities, changeset)
                    }
                    StackRule::LowestWins => {
                        Self::apply_lowest_wins_op(applied, op, trigger_event, entities, changeset)
                    }
                    StackRule::Exclusive => {
                        Self::apply_exclusive_op(applied, op, trigger_event, entities, changeset)
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
    fn stack_key(&self, op: &Operation, rule: &StackRule) -> String {
        match rule {
            StackRule::Named(group) => format!("{}::{}::{}", op.target, op.path, group),
            _ => format!("{}::{}", op.target, op.path),
        }
    }

    fn apply_additive_op(
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

    fn apply_highest_wins_op(
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

    fn apply_lowest_wins_op(
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

    fn apply_exclusive_op(
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
    use std::collections::HashMap;
    use uuid::Uuid;

    fn make_entity(id: &str, props: HashMap<String, Value>) -> Entity {
        Entity {
            id: id.to_string(),
            entity_type: "character".to_string(),
            properties: props,
            tags: vec![],
            mdx_body: String::new(),
            source_pack: "test".to_string(),
            subscriptions: vec![],
            computed_views: vec![],
            prototype: None,
        }
    }

    #[test]
    fn test_dispatch_triggers_subscription() {
        let mut dispatcher = Dispatcher::new();
        let mut entities = HashMap::new();

        let mut sub = Subscription::new(
            "race.selected",
            vec![Operation::new(
                OpCode::Set,
                "char1",
                "speed",
                Value::Int(30),
                "test",
            )],
            "test",
        );
        sub.priority = 50;

        let mut entity = make_entity("char1", HashMap::new());
        entity.add_subscription(sub);
        dispatcher.index_entity(&entity);
        entities.insert("char1".to_string(), entity);

        let queue_id = Uuid::new_v4();
        let event = Event::new("race.selected", "system", queue_id, 1)
            .with_target("char1")
            .with_payload("race_id", Value::Str("human".to_string()));

        let mut changeset = Changeset::new();
        let mut queue_manager = QueueManager::new();
        queue_manager.create_root_queue();

        dispatcher.dispatch(&event, &mut entities, &queue_manager, &mut changeset);

        let char_entity = entities.get("char1").unwrap();
        assert_eq!(char_entity.get_property("speed"), Some(&Value::Int(30)));
    }

    #[test]
    fn test_predicate_evaluation() {
        let dispatcher = Dispatcher::new();
        let queue_id = Uuid::new_v4();

        let event = Event::new("test", "system", queue_id, 1).with_payload("value", Value::Int(10));

        let entities: HashMap<String, Entity> = HashMap::new();
        let changeset = Changeset::new();

        assert!(dispatcher.evaluate(
            &Predicate::Gt("event.payload.value".to_string(), Value::Int(5)),
            &event,
            &entities,
            &changeset
        ));
        assert!(!dispatcher.evaluate(
            &Predicate::Gt("event.payload.value".to_string(), Value::Int(15)),
            &event,
            &entities,
            &changeset
        ));
        assert!(dispatcher.evaluate(
            &Predicate::Eq("event.payload.value".to_string(), Value::Int(10)),
            &event,
            &entities,
            &changeset
        ));
    }

    #[test]
    fn test_payload_reference_in_operation() {
        let mut dispatcher = Dispatcher::new();
        let mut entities = HashMap::new();
        entities.insert("char1".to_string(), make_entity("char1", HashMap::new()));

        let queue_id = Uuid::new_v4();
        let event = Event::new("test", "system", queue_id, 1)
            .with_target("char1")
            .with_payload("bonus", Value::Int(5));

        let op = Operation::new(
            OpCode::Set,
            "char1",
            "attack_bonus",
            Value::Str("{bonus}".to_string()),
            "test",
        );

        let mut changeset = Changeset::new();
        let queue_manager = QueueManager::new();

        dispatcher.apply_operation(&op, &event, &mut entities, &mut changeset, &queue_manager);

        let char_entity = entities.get("char1").unwrap();
        assert_eq!(
            char_entity.get_property("attack_bonus"),
            Some(&Value::Int(5))
        );
    }

    #[test]
    fn test_stack_rule_highest_wins() {
        let mut dispatcher = Dispatcher::new();
        let mut entities = HashMap::new();
        entities.insert(
            "char1".to_string(),
            make_entity("char1", HashMap::new()),
        );

        let queue_id = Uuid::new_v4();

        // First HighestWins operation: +5 to attack_bonus
        let event1 = Event::new("feat.gained", "system", queue_id, 1)
            .with_target("char1")
            .with_payload("feat_id", Value::Str("power_attack".to_string()));
        let op1 = Operation::new(OpCode::Set, "char1", "attack_bonus", Value::Int(5), "power_attack")
            .with_stack_rule(StackRule::HighestWins);

        let mut changeset1 = Changeset::new();
        let queue_manager = QueueManager::new();
        dispatcher.apply_stacked_op(
            &op1,
            &event1,
            &mut entities,
            &mut changeset1,
            &queue_manager,
        );

        // Second HighestWins operation: +3 to attack_bonus — lower, should not win
        let op2 = Operation::new(OpCode::Set, "char1", "attack_bonus", Value::Int(3), "cleave")
            .with_stack_rule(StackRule::HighestWins);

        let event2 = Event::new("feat.gained", "system", queue_id, 2)
            .with_target("char1")
            .with_payload("feat_id", Value::Str("cleave".to_string()));
        let mut changeset2 = Changeset::new();
        dispatcher.apply_stacked_op(
            &op2,
            &event2,
            &mut entities,
            &mut changeset2,
            &queue_manager,
        );

        // Third HighestWins operation: +10 to attack_bonus — highest, should win
        let op3 = Operation::new(OpCode::Set, "char1", "attack_bonus", Value::Int(10), "great_cleave")
            .with_stack_rule(StackRule::HighestWins);

        let event3 = Event::new("feat.gained", "system", queue_id, 3)
            .with_target("char1")
            .with_payload("feat_id", Value::Str("great_cleave".to_string()));
        let mut changeset3 = Changeset::new();
        dispatcher.apply_stacked_op(
            &op3,
            &event3,
            &mut entities,
            &mut changeset3,
            &queue_manager,
        );

        let char_entity = entities.get("char1").unwrap();
        // The highest value across all HighestWins operations should be chosen
        assert_eq!(
            char_entity.get_property("attack_bonus"),
            Some(&Value::Int(10))
        );
    }

    #[test]
    fn test_stack_rule_additive() {
        let mut dispatcher = Dispatcher::new();
        let mut entities = HashMap::new();
        entities.insert(
            "char1".to_string(),
            make_entity("char1", HashMap::new()),
        );

        let queue_id = Uuid::new_v4();
        let queue_manager = QueueManager::new();

        // First Additive operation: +3 to damage_bonus
        let event1 = Event::new("feat.gained", "system", queue_id, 1)
            .with_target("char1")
            .with_payload("feat_id", Value::Str("weapon_focus".to_string()));
        let op1 = Operation::new(OpCode::Set, "char1", "damage_bonus", Value::Int(3), "weapon_focus")
            .with_stack_rule(StackRule::Additive);

        let mut changeset1 = Changeset::new();
        dispatcher.apply_stacked_op(
            &op1,
            &event1,
            &mut entities,
            &mut changeset1,
            &queue_manager,
        );

        // Second Additive operation: +2 to damage_bonus — should be summed
        let event2 = Event::new("feat.gained", "system", queue_id, 2)
            .with_target("char1")
            .with_payload("feat_id", Value::Str("greater_weapon_focus".to_string()));
        let op2 = Operation::new(
            OpCode::Set,
            "char1",
            "damage_bonus",
            Value::Int(2),
            "greater_weapon_focus",
        )
        .with_stack_rule(StackRule::Additive);

        let mut changeset2 = Changeset::new();
        dispatcher.apply_stacked_op(
            &op2,
            &event2,
            &mut entities,
            &mut changeset2,
            &queue_manager,
        );

        let char_entity = entities.get("char1").unwrap();
        // Additive stack: 3 + 2 = 5
        assert_eq!(
            char_entity.get_property("damage_bonus"),
            Some(&Value::Int(5))
        );
    }

    #[test]
    fn test_stack_rule_lowest_wins() {
        let mut dispatcher = Dispatcher::new();
        let mut entities = HashMap::new();
        entities.insert("char1".to_string(), make_entity("char1", HashMap::new()));

        let queue_id = Uuid::new_v4();
        let queue_manager = QueueManager::new();

        let op1 = Operation::new(OpCode::Set, "char1", "ac_penalty", Value::Int(5), "armor_penalty")
            .with_stack_rule(StackRule::LowestWins);
        let mut changeset1 = Changeset::new();
        dispatcher.apply_stacked_op(
            &op1,
            &Event::new("armor.equipped", "system", queue_id, 1).with_target("char1"),
            &mut entities,
            &mut changeset1,
            &queue_manager,
        );

        let op2 = Operation::new(OpCode::Set, "char1", "ac_penalty", Value::Int(3), "shield_penalty")
            .with_stack_rule(StackRule::LowestWins);
        let mut changeset2 = Changeset::new();
        dispatcher.apply_stacked_op(
            &op2,
            &Event::new("shield.equipped", "system", queue_id, 2).with_target("char1"),
            &mut entities,
            &mut changeset2,
            &queue_manager,
        );

        let char_entity = entities.get("char1").unwrap();
        // LowestWins: min(5, 3) = 3
        assert_eq!(
            char_entity.get_property("ac_penalty"),
            Some(&Value::Int(3))
        );
    }

    #[test]
    fn test_stack_rule_exclusive() {
        let mut dispatcher = Dispatcher::new();
        let mut entities = HashMap::new();
        entities.insert("char1".to_string(), make_entity("char1", HashMap::new()));

        let queue_id = Uuid::new_v4();
        let queue_manager = QueueManager::new();

        let op1 = Operation::new(OpCode::Set, "char1", "attack_mode", Value::Str("normal".to_string()), "class_feat")
            .with_stack_rule(StackRule::Exclusive);
        let mut changeset1 = Changeset::new();
        dispatcher.apply_stacked_op(
            &op1,
            &Event::new("mode.set", "system", queue_id, 1).with_target("char1"),
            &mut entities,
            &mut changeset1,
            &queue_manager,
        );

        let op2 = Operation::new(OpCode::Set, "char1", "attack_mode", Value::Str("power".to_string()), "rage")
            .with_stack_rule(StackRule::Exclusive);
        let mut changeset2 = Changeset::new();
        dispatcher.apply_stacked_op(
            &op2,
            &Event::new("mode.set", "system", queue_id, 2).with_target("char1"),
            &mut entities,
            &mut changeset2,
            &queue_manager,
        );

        let char_entity = entities.get("char1").unwrap();
        // Exclusive: most recent replaces
        assert_eq!(
            char_entity.get_property("attack_mode"),
            Some(&Value::Str("power".to_string()))
        );
    }

    #[test]
    fn test_entity_direct_subscriptions_fire() {
        let mut dispatcher = Dispatcher::new();
        let mut entities = HashMap::new();

        // Entity with its own subscription (NOT via index_entity)
        let mut entity = make_entity("char1", HashMap::new());
        let sub = Subscription::new(
            "custom.event",
            vec![Operation::new(
                OpCode::Set,
                "char1",
                "custom.property",
                Value::Int(42),
                "inline",
            )],
            "inline-source",
        );
        entity.add_subscription(sub);

        entities.insert("char1".to_string(), entity);

        let queue_id = Uuid::new_v4();
        let event = Event::new("custom.event", "system", queue_id, 1)
            .with_target("char1");

        let mut changeset = Changeset::new();
        let queue_manager = QueueManager::new();

        // Note: NOT calling index_entity - subscription is on entity directly
        dispatcher.dispatch(&event, &mut entities, &queue_manager, &mut changeset);

        let char_entity = entities.get("char1").unwrap();
        assert_eq!(char_entity.get_property("custom.property"), Some(&Value::Int(42)));
    }

    #[test]
    fn test_stack_rule_named() {
        let mut dispatcher = Dispatcher::new();
        let mut entities = HashMap::new();
        entities.insert("char1".to_string(), make_entity("char1", HashMap::new()));

        let queue_id = Uuid::new_v4();
        let queue_manager = QueueManager::new();

        // Two Named operations with same group "enhancement" — highest wins within group
        let op1 = Operation::new(
            OpCode::Set,
            "char1",
            "strength_enhance",
            Value::Int(2),
            "belt_of_giant_str",
        )
        .with_stack_rule(StackRule::Named("enhancement".to_string()));
        let mut changeset1 = Changeset::new();
        dispatcher.apply_stacked_op(
            &op1,
            &Event::new("item.equipped", "system", queue_id, 1).with_target("char1"),
            &mut entities,
            &mut changeset1,
            &queue_manager,
        );

        let op2 = Operation::new(
            OpCode::Set,
            "char1",
            "strength_enhance",
            Value::Int(4),
            "belt_of_giant_str_greater",
        )
        .with_stack_rule(StackRule::Named("enhancement".to_string()));
        let mut changeset2 = Changeset::new();
        dispatcher.apply_stacked_op(
            &op2,
            &Event::new("item.equipped", "system", queue_id, 2).with_target("char1"),
            &mut entities,
            &mut changeset2,
            &queue_manager,
        );

        // Different group "competence" — additive with enhancement group
        let op3 = Operation::new(
            OpCode::Set,
            "char1",
            "strength_enhance",
            Value::Int(3),
            "gloves_of_skill",
        )
        .with_stack_rule(StackRule::Named("competence".to_string()));
        let mut changeset3 = Changeset::new();
        dispatcher.apply_stacked_op(
            &op3,
            &Event::new("item.equipped", "system", queue_id, 3).with_target("char1"),
            &mut entities,
            &mut changeset3,
            &queue_manager,
        );

        let char_entity = entities.get("char1").unwrap();
        // Named(enhancement): highest wins within group → max(2, 4) = 4
        // Named(competence): highest wins within group → 3
        // Additive across groups: 4 + 3 = 7
        assert_eq!(
            char_entity.get_property("strength_enhance"),
            Some(&Value::Int(7))
        );
    }

    #[test]
    fn test_computed_view_evaluates_on_input_change() {
        let mut dispatcher = Dispatcher::new();
        let mut entities = HashMap::new();

        // Create entity with initial score
        let mut entity = make_entity("char1", HashMap::new());
        entity.set_property("abilities.strength.score", Value::Int(10));

        // Add a subscription that changes the score to 16
        let sub = Subscription::new(
            "race.selected",
            vec![Operation::new(
                OpCode::Set,
                "char1",
                "abilities.strength.score",
                Value::Int(16),
                "test",
            )],
            "test",
        );
        entity.add_subscription(sub);
        dispatcher.index_entity(&entity);

        // Add computed view: modifier = floor((score - 10) / 2)
        let modifier_view = ComputedView::new(
            "char1",
            "abilities.strength.modifier",
            vec!["abilities.strength.score".to_string()],
            Computation::Floor(Box::new(Computation::Div(
                Box::new(Computation::Sub(
                    Box::new(Computation::ReadPath("abilities.strength.score".to_string())),
                    Box::new(Computation::Literal(Value::Int(10))),
                )),
                Box::new(Computation::Literal(Value::Int(2))),
            ))),
            "test",
        );
        entity.add_computed_view(modifier_view);

        entities.insert("char1".to_string(), entity);

        let queue_id = Uuid::new_v4();
        let event = Event::new("race.selected", "system", queue_id, 1)
            .with_target("char1")
            .with_payload("race_id", Value::Str("human".to_string()));

        let mut changeset = Changeset::new();
        let queue_manager = QueueManager::new();

        dispatcher.dispatch(&event, &mut entities, &queue_manager, &mut changeset);

        let char_entity = entities.get("char1").unwrap();
        // score was set to 16; modifier = (16 - 10) / 2 = 3
        assert_eq!(char_entity.get_property("abilities.strength.score"), Some(&Value::Int(16)));
        assert_eq!(
            char_entity.get_property("abilities.strength.modifier"),
            Some(&Value::Int(3))
        );
    }
}
