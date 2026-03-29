//! Skill point allocation.

use std::collections::HashMap;

use crate::entity::Value;
use crate::engine::character::skill_to_ability_key;
use crate::engine::Engine;
use crate::engine::EngineError;

/// Allocates skill points across a character's skills.
pub struct AllocateSkillPoints;

impl AllocateSkillPoints {
    pub fn execute(
        engine: &mut Engine,
        character_id: &str,
        skill_allocations: HashMap<String, i64>,
    ) -> Result<(), EngineError> {
        // Immutable reads
        let (class_id, remaining, level) = {
            let character = engine
                .entities
                .get(character_id)
                .ok_or_else(|| EngineError::EntityNotFound {
                    entity_type: "Character".to_string(),
                    id: character_id.to_string(),
                })?;
            let remaining = character
                .properties
                .get("skill_points_remaining")
                .and_then(|v| v.as_int())
                .unwrap_or(0);
            let class_id = character
                .properties
                .get("class")
                .and_then(|v| v.as_str())
                .ok_or_else(|| EngineError::ValidationError("No class selected".to_string()))?;
            let level = character
                .properties
                .get("level")
                .and_then(|v| v.as_int())
                .unwrap_or(1) as i64;
            (class_id.to_string(), remaining, level)
        };

        let class_skills: Vec<String> = engine
            .entities
            .get(&class_id)
            .ok_or_else(|| EngineError::EntityNotFound {
                entity_type: "Class".to_string(),
                id: class_id.clone(),
            })?
            .properties
            .get("classSkills")
            .and_then(|v| v.as_list())
            .map(|list| {
                list.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();

        // Pre-compute current ranks
        let current_ranks: HashMap<String, i64> = {
            let character = engine.entities.get(character_id).unwrap();
            skill_allocations
                .keys()
                .filter(|k| !k.is_empty())
                .map(|skill| {
                    let ranks = character
                        .properties
                        .get(&format!("skills.{}.ranks", skill))
                        .and_then(|v| v.as_int())
                        .unwrap_or(0);
                    (skill.clone(), ranks)
                })
                .collect()
        };

        let mut total_cost = 0i64;
        let mut new_ranks = HashMap::new();

        for (skill, ranks_delta) in &skill_allocations {
            if *ranks_delta == 0 {
                continue;
            }

            let current = *current_ranks.get(skill).unwrap_or(&0);
            let is_class_skill = class_skills
                .iter()
                .any(|cs| cs.to_lowercase() == skill.to_lowercase());
            let cost_per_rank = if is_class_skill { 1 } else { 2 };
            let max_ranks = if is_class_skill { level + 3 } else { (level + 3) / 2 };

            if current + *ranks_delta > max_ranks {
                return Err(EngineError::ValidationError(format!(
                    "Cannot add {} ranks to {} (max {} for {} skill at level {})",
                    ranks_delta,
                    skill,
                    max_ranks,
                    if is_class_skill { "class" } else { "cross-class" },
                    level
                )));
            }
            if current + *ranks_delta < 0 {
                return Err(EngineError::ValidationError(format!(
                    "Cannot reduce {} below 0",
                    skill
                )));
            }

            total_cost += ranks_delta * cost_per_rank;
            new_ranks.insert(skill.clone(), current + *ranks_delta);
        }

        if total_cost > remaining {
            return Err(EngineError::ValidationError(format!(
                "Not enough skill points (need {}, have {})",
                total_cost, remaining
            )));
        }

        // Mutable write
        let character = engine
            .entities
            .get_mut(character_id)
            .ok_or_else(|| EngineError::EntityNotFound {
                entity_type: "Character".to_string(),
                id: character_id.to_string(),
            })?;

        let new_remaining = remaining - total_cost;
        character.set_property("skill_points_remaining", Value::Int(new_remaining));

        for (skill, ranks) in &new_ranks {
            let path = format!("skills.{}.ranks", skill);
            character.set_property(&path, Value::Int(*ranks));

            let ability_key = skill_to_ability_key(skill);
            let ability_mod = character
                .properties
                .get(&format!("abilities.{}.modifier", ability_key))
                .and_then(|v| v.as_int())
                .unwrap_or(0);
            character.set_property(
                &format!("skills.{}.modifier", skill),
                Value::Int(*ranks + ability_mod),
            );
        }

        character.set_property("skill_points_allocated", Value::Bool(true));

        let mut allocation_values = std::collections::HashMap::new();
        for (skill, ranks) in &new_ranks {
            allocation_values.insert(skill.clone(), Value::Int(*ranks));
        }

        engine.emit_event(character_id, "skills.allocated", allocation_values)?;
        engine.complete_workflow_step(character_id, "allocate-skills");

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine::character::CreateCharacter;
    use crate::engine::selection::SelectClass;
    use crate::entity::Entity;

    #[test]
    fn test_allocate_skill_points_class_skill() {
        let mut engine = Engine::new();
        let char_id = CreateCharacter::execute(&mut engine, "Thorin");

        let fighter = Entity {
            id: "srd:class:fighter".to_string(),
            entity_type: "class".to_string(),
            properties: {
                let mut p = std::collections::HashMap::new();
                p.insert("name".to_string(), Value::Str("Fighter".to_string()));
                p.insert(
                    "classSkills".to_string(),
                    Value::List(vec![
                        Value::Str("Climb".to_string()),
                        Value::Str("Jump".to_string()),
                        Value::Str("Swim".to_string()),
                    ]),
                );
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

        SelectClass::execute(&mut engine, &char_id, "srd:class:fighter", 1, "A").unwrap();

        {
            let character = engine.entities.get_mut(&char_id).unwrap();
            character.set_property("skill_points_remaining", Value::Int(4));
        }

        let mut allocations = HashMap::new();
        allocations.insert("Climb".to_string(), 1);

        AllocateSkillPoints::execute(&mut engine, &char_id, allocations).unwrap();

        let character = engine.get_entity(&char_id).unwrap();
        assert_eq!(
            character.get_property("skills.Climb.ranks"),
            Some(&Value::Int(1))
        );
        assert_eq!(
            character.get_property("skill_points_remaining"),
            Some(&Value::Int(3))
        );
    }
}
