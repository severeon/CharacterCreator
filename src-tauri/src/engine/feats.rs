//! Feat selection.

use std::collections::HashMap;

use crate::entity::{Entity, Value};
use crate::engine::Engine;
use crate::engine::EngineError;

/// Selects a feat for a character.
pub struct SelectFeat;

impl SelectFeat {
    pub fn execute(
        engine: &mut Engine,
        character_id: &str,
        feat_id: &str,
    ) -> Result<(), EngineError> {
        let (slots_available, existing_feats) = {
            let _ = engine
                .entities
                .get(feat_id)
                .ok_or_else(|| EngineError::EntityNotFound {
                    entity_type: "Feat".to_string(),
                    id: feat_id.to_string(),
                })?;

            let character = engine
                .entities
                .get(character_id)
                .ok_or_else(|| EngineError::EntityNotFound {
                    entity_type: "Character".to_string(),
                    id: character_id.to_string(),
                })?;

            let slots = character
                .properties
                .get("feat_slots_remaining")
                .and_then(|v| v.as_int())
                .unwrap_or(1);

            let existing: Vec<String> = character
                .properties
                .get("feats_selected")
                .and_then(|v| v.as_list())
                .map(|list| {
                    list.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default();

            (slots, existing)
        };

        if slots_available <= 0 {
            return Err(EngineError::ValidationError(
                "No feat slots remaining".to_string(),
            ));
        }

        if existing_feats.contains(&feat_id.to_string()) {
            return Err(EngineError::ValidationError(
                "Feat already selected".to_string(),
            ));
        }

        let character = engine
            .entities
            .get_mut(character_id)
            .ok_or_else(|| EngineError::EntityNotFound {
                entity_type: "Character".to_string(),
                id: character_id.to_string(),
            })?;

        let mut feats_list = existing_feats;
        feats_list.push(feat_id.to_string());
        character.set_property(
            "feats_selected",
            Value::List(feats_list.iter().map(|s| Value::Str(s.clone())).collect()),
        );
        character.set_property("feat_slots_remaining", Value::Int(slots_available - 1));

        let mut payload = HashMap::new();
        payload.insert("feat_id".to_string(), Value::Str(feat_id.to_string()));
        engine.emit_event(character_id, "feat.selected", payload)?;
        engine.complete_workflow_step(character_id, "select-feats");

        Ok(())
    }
}

/// Returns all feats not yet selected by the character.
pub struct GetAvailableFeats;

impl GetAvailableFeats {
    pub fn execute(engine: &Engine, character_id: &str) -> Vec<Entity> {
        let character = match engine.entities.get(character_id) {
            Some(c) => c,
            None => return vec![],
        };

        let selected_ids: Vec<String> = character
            .properties
            .get("feats_selected")
            .and_then(|v| v.as_list())
            .map(|list| {
                list.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();

        engine
            .entities
            .values()
            .filter(|e| e.entity_type == "feat" && !selected_ids.contains(&e.id))
            .cloned()
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine::character::CreateCharacter;

    fn make_feat(id: &str, name: &str) -> Entity {
        Entity {
            id: id.to_string(),
            entity_type: "feat".to_string(),
            properties: {
                let mut p = std::collections::HashMap::new();
                p.insert("name".to_string(), Value::Str(name.to_string()));
                p
            },
            tags: vec![],
            mdx_body: String::new(),
            source_pack: "srd-3.5e".to_string(),
            subscriptions: vec![],
            computed_views: vec![],
            prototype: None,
        }
    }

    #[test]
    fn test_select_feat_consumes_slot() {
        let mut engine = Engine::new();
        let char_id = CreateCharacter::execute(&mut engine, "Thorin");

        engine.entities.insert(make_feat("srd:feat:power-attack", "Power Attack").id.clone(), make_feat("srd:feat:power-attack", "Power Attack"));

        {
            let character = engine.entities.get_mut(&char_id).unwrap();
            character.set_property("feat_slots_remaining", Value::Int(1));
        }

        SelectFeat::execute(&mut engine, &char_id, "srd:feat:power-attack").unwrap();

        let character = engine.get_entity(&char_id).unwrap();
        assert_eq!(
            character.get_property("feat_slots_remaining"),
            Some(&Value::Int(0))
        );
        assert!(character.get_property("feats_selected").is_some());
    }

    #[test]
    fn test_get_available_feats_excludes_selected() {
        let mut engine = Engine::new();
        let char_id = CreateCharacter::execute(&mut engine, "Thorin");

        engine.entities.insert(make_feat("srd:feat:power-attack", "Power Attack").id.clone(), make_feat("srd:feat:power-attack", "Power Attack"));

        {
            let character = engine.entities.get_mut(&char_id).unwrap();
            character.set_property("feat_slots_remaining", Value::Int(1));
        }

        let available = GetAvailableFeats::execute(&engine, &char_id);
        let feat_ids: Vec<&str> = available.iter().map(|e| e.id.as_str()).collect();
        assert!(feat_ids.contains(&"srd:feat:power-attack"));

        // Select it
        SelectFeat::execute(&mut engine, &char_id, "srd:feat:power-attack").unwrap();

        let available = GetAvailableFeats::execute(&engine, &char_id);
        let feat_ids: Vec<&str> = available.iter().map(|e| e.id.as_str()).collect();
        assert!(!feat_ids.contains(&"srd:feat:power-attack"));
    }
}
