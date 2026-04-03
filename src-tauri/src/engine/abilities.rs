//! Ability score assignment.

use std::collections::HashMap;

use crate::entity::Value;
use crate::engine::Engine;
use crate::engine::EngineError;

/// Compute the ability modifier for a given score, using the formula from the
/// `srd:mechanic:ability-scores` mechanic entity if loaded, falling back to the
/// hardcoded D&D 3.5e formula `(score - 10) / 2` if not.
#[allow(dead_code)]
pub fn compute_ability_modifier(engine: &Engine, score: i64) -> i64 {
    let formula = engine
        .entities
        .get("srd:mechanic:ability-scores")
        .and_then(|e| e.properties.get("modifier_formula"))
        .and_then(|v| v.as_str())
        .unwrap_or("(score - 10) / 2");

    let ctx = serde_json::json!({ "score": score });
    crate::expression_eval::evaluate(formula, &ctx)
        .ok()
        .and_then(|v| v.as_f64())
        .map(|f| f as i64)
        .unwrap_or_else(|| (score - 10) / 2)
}

/// Assigns the six base ability scores to a character.
pub struct AssignAbilityScores;

impl AssignAbilityScores {
    pub fn execute(
        engine: &mut Engine,
        character_id: &str,
        scores: HashMap<String, i64>,
    ) -> Result<(), EngineError> {
        // Extract the modifier formula before taking a mutable borrow on the entity store,
        // so the immutable lookup doesn't conflict with the subsequent get_mut.
        let modifier_formula = engine
            .entities
            .get("srd:mechanic:ability-scores")
            .and_then(|e| e.properties.get("modifier_formula"))
            .and_then(|v| v.as_str())
            .unwrap_or("(score - 10) / 2")
            .to_string();

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
            let ctx = serde_json::json!({ "score": *score });
            let modifier = crate::expression_eval::evaluate(&modifier_formula, &ctx)
                .ok()
                .and_then(|v| v.as_f64())
                .map(|f| f as i64)
                .unwrap_or_else(|| (score - 10) / 2);
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
    fn test_compute_ability_modifier_from_engine() {
        // Without mechanic entity loaded — falls back to hardcoded formula
        let engine = Engine::default();
        assert_eq!(compute_ability_modifier(&engine, 10), 0);
        assert_eq!(compute_ability_modifier(&engine, 16), 3);
        assert_eq!(compute_ability_modifier(&engine, 8), -1);
    }

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
