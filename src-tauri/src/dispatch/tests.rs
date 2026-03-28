#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use uuid::Uuid;

    use crate::computed_view::{Computation, ComputedView};
    use crate::dispatch::Dispatcher;
    use crate::entity::{Entity, Value};
    use crate::event::Event;
    use crate::operation::{OpCode, Operation, StackRule};
    use crate::queue::{Changeset, QueueManager};
    use crate::subscription::Subscription;

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
        use crate::dispatch::predicate::PredicateEvaluator;
        use crate::subscription::Predicate;

        let queue_id = Uuid::new_v4();

        let event = Event::new("test", "system", queue_id, 1).with_payload("value", Value::Int(10));

        let entities: HashMap<String, Entity> = HashMap::new();
        let changeset = Changeset::new();

        assert!(PredicateEvaluator::evaluate(
            &Predicate::Gt("event.payload.value".to_string(), Value::Int(5)),
            &event,
            &entities,
            &changeset
        ));
        assert!(!PredicateEvaluator::evaluate(
            &Predicate::Gt("event.payload.value".to_string(), Value::Int(15)),
            &event,
            &entities,
            &changeset
        ));
        assert!(PredicateEvaluator::evaluate(
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
        let queue_manager = QueueManager::new();

        // First HighestWins operation: +5 to attack_bonus
        let event1 = Event::new("feat.gained", "system", queue_id, 1)
            .with_target("char1")
            .with_payload("feat_id", Value::Str("power_attack".to_string()));
        let op1 = Operation::new(OpCode::Set, "char1", "attack_bonus", Value::Int(5), "power_attack")
            .with_stack_rule(StackRule::HighestWins);

        let mut changeset1 = Changeset::new();
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
