//! Race and class selection.

use std::collections::HashMap;

use crate::entity::Value;
use crate::engine::Engine;
use crate::engine::EngineError;

/// Selects a race for a character.
pub struct SelectRace;

impl SelectRace {
    pub fn execute(
        engine: &mut Engine,
        character_id: &str,
        race_id: &str,
    ) -> Result<(), EngineError> {
        let race = engine
            .entities
            .get(race_id)
            .ok_or_else(|| EngineError::EntityNotFound {
                entity_type: "Race".to_string(),
                id: race_id.to_string(),
            })?
            .clone();

        {
            let character = engine
                .entities
                .get_mut(character_id)
                .ok_or_else(|| EngineError::EntityNotFound {
                    entity_type: "Character".to_string(),
                    id: character_id.to_string(),
                })?;

            character
                .properties
                .insert("race".to_string(), Value::Str(race_id.to_string()));
            if let Some(name) = race.properties.get("name").cloned() {
                character.properties.insert("race_name".to_string(), name);
            }
            if let Some(size) = race.properties.get("size").cloned() {
                character.properties.insert("size".to_string(), size);
            }
            if let Some(speed) = race.properties.get("speed").cloned() {
                character.properties.insert("speed".to_string(), speed);
            }
        }

        let mut payload = HashMap::new();
        payload.insert("race_id".to_string(), Value::Str(race_id.to_string()));
        engine.emit_event(character_id, "race.selected", payload)?;
        engine.complete_workflow_step(character_id, "select-race");

        Ok(())
    }
}

/// Selects a class (and level) for a character, optionally in a gestalt slot.
pub struct SelectClass;

impl SelectClass {
    pub fn execute(
        engine: &mut Engine,
        character_id: &str,
        class_id: &str,
        level: i32,
        slot: &str,
    ) -> Result<(), EngineError> {
        let class_entity = engine
            .entities
            .get(class_id)
            .ok_or_else(|| EngineError::EntityNotFound {
                entity_type: "Class".to_string(),
                id: class_id.to_string(),
            })?
            .clone();

        let prefix = if slot == "B" { "class_b" } else { "class" };

        {
            let character = engine
                .entities
                .get_mut(character_id)
                .ok_or_else(|| EngineError::EntityNotFound {
                    entity_type: "Character".to_string(),
                    id: character_id.to_string(),
                })?;

            character
                .properties
                .insert(format!("{}.id", prefix), Value::Str(class_id.to_string()));
            character.properties.insert(
                format!("{}.name", prefix),
                class_entity
                    .properties
                    .get("name")
                    .cloned()
                    .unwrap_or(Value::Str(class_id.to_string())),
            );
            character
                .properties
                .insert("level".to_string(), Value::Int(level as i64));

            if let Some(hd) = class_entity.properties.get("hd").cloned() {
                character.properties.insert(format!("{}.hd", prefix), hd);
            }
            if let Some(bab) = class_entity.properties.get("bab").cloned() {
                character
                    .properties
                    .insert(format!("{}.bab", prefix), bab);
            }
            if let Some(sp) = class_entity.properties.get("skillPoints").cloned() {
                character
                    .properties
                    .insert(format!("{}.skill_points", prefix), sp);
            }

            // Legacy properties for non-gestalt slot A
            if slot != "B" {
                character
                    .properties
                    .insert("class".to_string(), Value::Str(class_id.to_string()));
                character.properties.insert(
                    "class_name".to_string(),
                    class_entity
                        .properties
                        .get("name")
                        .cloned()
                        .unwrap_or(Value::Str(class_id.to_string())),
                );
                if let Some(hd) = class_entity.properties.get("hd").cloned() {
                    character.properties.insert("hit_die".to_string(), hd);
                }
                if let Some(bab) = class_entity.properties.get("bab").cloned() {
                    character
                        .properties
                        .insert("base_attack_bonus".to_string(), bab);
                }
                if let Some(sp) = class_entity.properties.get("skillPoints").cloned() {
                    character
                        .properties
                        .insert("skill_points_per_level".to_string(), sp);
                }
            }
        }

        let mut payload = HashMap::new();
        payload.insert("class_id".to_string(), Value::Str(class_id.to_string()));
        payload.insert("level".to_string(), Value::Int(level as i64));
        engine.emit_event(character_id, "class.selected", payload)?;
        engine.complete_workflow_step(character_id, "select-class");

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine::character::CreateCharacter;
    use crate::entity::Entity;

    #[test]
    fn test_select_class_gestalt() {
        let mut engine = Engine::new();

        let wizard = Entity {
            id: "srd:class:wizard".to_string(),
            entity_type: "class".to_string(),
            properties: {
                let mut p = std::collections::HashMap::new();
                p.insert("name".to_string(), Value::Str("Wizard".to_string()));
                p.insert("hd".to_string(), Value::Int(4));
                p.insert("bab".to_string(), Value::Str("weak".to_string()));
                p.insert("skillPoints".to_string(), Value::Int(2));
                p
            },
            tags: vec![],
            mdx_body: String::new(),
            source_pack: "srd-3.5e".to_string(),
            subscriptions: vec![],
            computed_views: vec![],
            prototype: None,
        };
        engine.entities.insert(wizard.id.clone(), wizard);

        let fighter = Entity {
            id: "srd:class:fighter".to_string(),
            entity_type: "class".to_string(),
            properties: {
                let mut p = std::collections::HashMap::new();
                p.insert("name".to_string(), Value::Str("Fighter".to_string()));
                p.insert("hd".to_string(), Value::Int(10));
                p.insert("bab".to_string(), Value::Str("good".to_string()));
                p.insert("skillPoints".to_string(), Value::Int(4));
                p
            },
            tags: vec![],
            mdx_body: String::new(),
            source_pack: "srd-3.5e".to_string(),
            subscriptions: vec![],
            computed_views: vec![],
            prototype: None,
        };
        engine.entities.insert(fighter.id.clone(), fighter);

        let char_id = CreateCharacter::execute(&mut engine, "Kira");

        // Select Fighter as Class A
        SelectClass::execute(&mut engine, &char_id, "srd:class:fighter", 1, "A").unwrap();

        let character = engine.get_entity(&char_id).unwrap();
        assert_eq!(
            character.get_property("class.id"),
            Some(&Value::Str("srd:class:fighter".to_string()))
        );

        // Select Wizard as Class B (gestalt)
        SelectClass::execute(&mut engine, &char_id, "srd:class:wizard", 1, "B").unwrap();

        let character = engine.get_entity(&char_id).unwrap();
        assert_eq!(
            character.get_property("class_b.id"),
            Some(&Value::Str("srd:class:wizard".to_string()))
        );
        // Class A preserved
        assert_eq!(
            character.get_property("class.id"),
            Some(&Value::Str("srd:class:fighter".to_string()))
        );
    }
}
