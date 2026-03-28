//! Character creation and identity management.

use std::collections::HashMap;
use uuid::Uuid;

use crate::entity::{Entity, Value};
use crate::engine::Engine;
use crate::engine::EngineError;

/// Creates a new character and returns its ID.
pub struct CreateCharacter;

impl CreateCharacter {
    pub fn execute(engine: &mut Engine, name: &str) -> String {
        let id = Uuid::new_v4().to_string();
        let character = Entity {
            id: id.clone(),
            entity_type: "character".to_string(),
            properties: {
                let mut props = HashMap::new();
                props.insert("name".to_string(), Value::Str(name.to_string()));
                props
            },
            tags: vec![],
            mdx_body: String::new(),
            source_pack: "creation".to_string(),
            subscriptions: vec![],
            computed_views: vec![],
            prototype: None,
        };
        engine.entities.insert(id.clone(), character);
        engine.active_character_id = Some(id.clone());
        id
    }
}

/// Updates a character's identity fields (player name, alignment, age, etc.).
pub struct UpdateCharacterIdentity;

impl UpdateCharacterIdentity {
    pub fn execute(
        engine: &mut Engine,
        character_id: &str,
        identity: HashMap<String, Value>,
    ) -> Result<(), EngineError> {
        let character = engine
            .entities
            .get_mut(character_id)
            .ok_or_else(|| EngineError::EntityNotFound {
                entity_type: "Character".to_string(),
                id: character_id.to_string(),
            })?;

        for (key, value) in identity {
            character.set_property(&key, value);
        }

        engine.emit_event(character_id, "identity.updated", HashMap::new())?;
        Ok(())
    }
}

/// Maps a skill name to the ability key it uses.
pub fn skill_to_ability_key(skill: &str) -> String {
    match skill.to_lowercase().as_str() {
        "climb" | "jump" | "swim" => "strength".to_string(),
        "balance" | "escape artist" | "hide" | "move silently"
        | "open lock" | "ride" | "sleight of hand" | "stealth" | "tumble" => {
            "dexterity".to_string()
        }
        "concentration" | "spellcraft" | "knowledge" | "alchemy" => {
            "intelligence".to_string()
        }
        "heal" | "listen" | "sense motive" | "survival" => "wisdom".to_string(),
        "bluff" | "diplomacy" | "disguise" | "gather information" | "handle animal"
        | "intimidate" | "perform" | "use magic device" => "charisma".to_string(),
        _ => "dexterity".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_character() {
        let mut engine = Engine::new();
        let id = CreateCharacter::execute(&mut engine, "Thorin");
        assert!(!id.is_empty());

        let character = engine.get_entity(&id).unwrap();
        assert_eq!(
            character.properties.get("name"),
            Some(&Value::Str("Thorin".to_string()))
        );
    }

    #[test]
    fn test_update_character_identity() {
        let mut engine = Engine::new();
        let char_id = CreateCharacter::execute(&mut engine, "Tordek");

        let mut identity = HashMap::new();
        identity.insert("player_name".to_string(), Value::Str("Alice".to_string()));
        identity.insert("alignment".to_string(), Value::Str("lawful-good".to_string()));
        identity.insert("age".to_string(), Value::Int(45));

        UpdateCharacterIdentity::execute(&mut engine, &char_id, identity).unwrap();

        let character = engine.get_entity(&char_id).unwrap();
        assert_eq!(
            character.get_property("player_name"),
            Some(&Value::Str("Alice".to_string()))
        );
        assert_eq!(
            character.get_property("alignment"),
            Some(&Value::Str("lawful-good".to_string()))
        );
        assert_eq!(character.get_property("age"), Some(&Value::Int(45)));
    }
}
