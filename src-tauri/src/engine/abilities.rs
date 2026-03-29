//! Ability score assignment.

use std::collections::HashMap;

use crate::entity::Value;
use crate::engine::Engine;
use crate::engine::EngineError;

/// Assigns the six base ability scores to a character.
pub struct AssignAbilityScores;

impl AssignAbilityScores {
    pub fn execute(
        engine: &mut Engine,
        character_id: &str,
        scores: HashMap<String, i64>,
    ) -> Result<(), EngineError> {
        let character = engine
            .entities
            .get_mut(character_id)
            .ok_or_else(|| EngineError::EntityNotFound {
                entity_type: "Character".to_string(),
                id: character_id.to_string(),
            })?;

        let mut score_values = std::collections::HashMap::new();
        for (ability, score) in &scores {
            let path = format!("abilities.{}.score", ability);
            character.set_property(&path, Value::Int(*score));
            score_values.insert(ability.clone(), Value::Int(*score));

            let mod_path = format!("abilities.{}.modifier", ability);
            let modifier = (*score - 10) / 2;
            character.set_property(&mod_path, Value::Int(modifier));
        }

        // Compute skill points remaining: (base_sp + INT mod) × 4 at level 1
        let int_mod = scores
            .get("intelligence")
            .map(|s| (s - 10) / 2)
            .unwrap_or_else(|| {
                character
                    .properties
                    .get("abilities.intelligence.modifier")
                    .and_then(|v| v.as_int())
                    .unwrap_or(0)
            });
        let base_sp = character
            .properties
            .get("skill_points_per_level")
            .and_then(|v| v.as_int())
            .unwrap_or(2);
        let level = character
            .properties
            .get("level")
            .and_then(|v| v.as_int())
            .unwrap_or(1);
        let sp_per_level = std::cmp::max(1, base_sp + int_mod);
        let sp_remaining = if level == 1 { sp_per_level * 4 } else { sp_per_level };
        character.set_property("skill_points_remaining", Value::Int(sp_remaining));

        let mut payload = std::collections::HashMap::new();
        for (ability, value) in &score_values {
            payload.insert(ability.clone(), value.clone());
        }

        engine.emit_event(character_id, "abilities.assigned", payload)?;
        engine.complete_workflow_step(character_id, "assign-ability-scores");

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine::character::CreateCharacter;

    #[test]
    fn test_assign_ability_scores() {
        let mut engine = Engine::new();
        let id = CreateCharacter::execute(&mut engine, "Thorin");

        let mut scores = HashMap::new();
        scores.insert("strength".to_string(), 16);
        scores.insert("dexterity".to_string(), 14);

        AssignAbilityScores::execute(&mut engine, &id, scores).unwrap();

        let character = engine.get_entity(&id).unwrap();
        assert_eq!(
            character.get_property("abilities.strength.score"),
            Some(&Value::Int(16))
        );
        assert_eq!(
            character.get_property("abilities.strength.modifier"),
            Some(&Value::Int(3))
        );
        assert_eq!(
            character.get_property("abilities.dexterity.score"),
            Some(&Value::Int(14))
        );
        assert_eq!(
            character.get_property("abilities.dexterity.modifier"),
            Some(&Value::Int(2))
        );
    }
}
