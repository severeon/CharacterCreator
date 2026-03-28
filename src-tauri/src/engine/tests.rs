//! Integration tests for the engine.
//! (Unit tests live in their respective modules.)

use std::collections::HashMap;

use crate::entity::{Entity, Value};
use crate::engine::character::CreateCharacter;
use crate::engine::query::GetWorkflowStatus;
use crate::engine::settings::DMSettings;
use crate::engine::Engine;

#[test]
fn test_workflow_status_after_identity_update() {
    let mut engine = Engine::new();

    let human = Entity {
        id: "srd:race:human".to_string(),
        entity_type: "race".to_string(),
        properties: {
            let mut p = HashMap::new();
            p.insert("name".to_string(), Value::Str("Human".to_string()));
            p.insert("size".to_string(), Value::Str("Medium".to_string()));
            p.insert("speed".to_string(), Value::Int(30));
            p
        },
        tags: vec![],
        mdx_body: String::new(),
        source_pack: "srd-3.5e".to_string(),
        subscriptions: vec![],
        computed_views: vec![],
        prototype: None,
    };
    engine.entities.insert(human.id.clone(), human);

    let char_id = CreateCharacter::execute(&mut engine, "Bruenor");

    let status = GetWorkflowStatus::execute(&engine, &char_id, "srd:workflow:character_creation");
    assert!(status.pending.contains(&"select-race".to_string()));
    assert!(status.completed.is_empty());

    crate::engine::selection::SelectRace::execute(&mut engine, &char_id, "srd:race:human").unwrap();
    let status = GetWorkflowStatus::execute(&engine, &char_id, "srd:workflow:character_creation");
    assert!(status.completed.contains(&"select-race".to_string()));
    assert!(status.pending.contains(&"select-class".to_string()));
}

#[test]
fn test_dm_settings() {
    let mut engine = Engine::new();

    let settings = engine.get_dm_settings();
    assert_eq!(settings.ability_method, "pointbuy");
    assert_eq!(settings.max_ability_score, 18);
    assert!(!settings.gestalt_required);
    assert!(!settings.no_templates);

    let new_settings = DMSettings {
        ability_method: "roll".to_string(),
        max_ability_score: 20,
        gestalt_required: true,
        no_templates: true,
        max_ecl: 15,
        no_racial_hd: true,
        enforce_prerequisites: true,
        notes: "Test campaign".to_string(),
        restricted_entities: vec!["srd:race:drow".to_string()],
    };
    engine.set_dm_settings(new_settings.clone());

    let settings = engine.get_dm_settings();
    assert_eq!(settings.ability_method, "roll");
    assert_eq!(settings.max_ability_score, 20);
    assert!(settings.gestalt_required);
    assert!(settings.no_templates);
    assert_eq!(settings.max_ecl, 15);
    assert_eq!(settings.notes, "Test campaign");
    assert_eq!(settings.restricted_entities.len(), 1);
    assert_eq!(settings.restricted_entities[0], "srd:race:drow");
}
