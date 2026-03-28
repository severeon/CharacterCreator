//! Character export (JSON and Markdown).

use crate::entity::Value;
use crate::engine::Engine;
use crate::engine::EngineError;

/// Exports a character's properties as pretty-printed JSON.
pub struct ExportCharacterJson;

impl ExportCharacterJson {
    pub fn execute(engine: &Engine, character_id: &str) -> Result<String, EngineError> {
        let character = engine
            .entities
            .get(character_id)
            .ok_or_else(|| EngineError::EntityNotFound {
                entity_type: "Character".to_string(),
                id: character_id.to_string(),
            })?;

        serde_json::to_string_pretty(&character.properties)
            .map_err(|e| EngineError::SerializationError(e.to_string()))
    }
}

/// Exports a character as a Markdown sheet.
pub struct ExportCharacterMarkdown;

impl ExportCharacterMarkdown {
    pub fn execute(engine: &Engine, character_id: &str) -> Result<String, EngineError> {
        let character = engine
            .entities
            .get(character_id)
            .ok_or_else(|| EngineError::EntityNotFound {
                entity_type: "Character".to_string(),
                id: character_id.to_string(),
            })?;

        let name = character
            .properties
            .get("name")
            .and_then(|v| match v {
                Value::Str(s) => Some(s.as_str()),
                _ => None,
            })
            .unwrap_or("Unnamed Character");

        let race = character
            .properties
            .get("race_name")
            .or_else(|| character.properties.get("race"))
            .and_then(|v| match v {
                Value::Str(s) => Some(s.as_str()),
                _ => None,
            })
            .unwrap_or("None");

        let class_name = character
            .properties
            .get("class_name")
            .or_else(|| character.properties.get("class"))
            .and_then(|v| match v {
                Value::Str(s) => Some(s.as_str()),
                _ => None,
            })
            .unwrap_or("None");

        let level = character
            .properties
            .get("level")
            .and_then(|v| match v {
                Value::Int(i) => Some(*i),
                _ => None,
            })
            .unwrap_or(1);

        let mut md = format!("# {}\n\n", name);
        md.push_str(&format!(
            "**Race:** {} | **Class:** {} | **Level:** {}\n\n",
            race, class_name, level
        ));

        // Ability Scores
        md.push_str("## Ability Scores\n\n");
        md.push_str("| Ability | Score | Modifier |\n");
        md.push_str("|---------|-------|----------|\n");
        for ability in &[
            "strength",
            "dexterity",
            "constitution",
            "intelligence",
            "wisdom",
            "charisma",
        ] {
            let score = character
                .properties
                .get(&format!("abilities.{}.score", ability))
                .and_then(|v| match v {
                    Value::Int(i) => Some(*i as i64),
                    _ => None,
                })
                .unwrap_or(10);
            let modifier = (score - 10) / 2;
            let mod_str = if modifier >= 0 {
                format!("+{}", modifier)
            } else {
                format!("{}", modifier)
            };
            let ability_label = ability
                .chars()
                .next()
                .unwrap()
                .to_uppercase()
                .to_string()
                + &ability.chars().skip(1).collect::<String>();
            md.push_str(&format!("| {} | {} | {} |\n", ability_label, score, mod_str));
        }

        // Skills
        md.push_str("\n## Skills\n\n");
        let mut skills: Vec<(&str, i64)> = Vec::new();
        for (key, val) in &character.properties {
            if key.starts_with("skills.") && key.ends_with(".ranks") {
                if let Value::Int(rank) = val {
                    let skill_name = key
                        .strip_prefix("skills.")
                        .unwrap()
                        .strip_suffix(".ranks")
                        .unwrap();
                    skills.push((skill_name, *rank as i64));
                }
            }
        }
        if skills.is_empty() {
            md.push_str("_No skills allocated._\n");
        } else {
            skills.sort_by(|a, b| a.0.cmp(b.0));
            for (skill, ranks) in &skills {
                md.push_str(&format!("- **{}**: {} ranks\n", skill, ranks));
            }
        }

        // Feats
        md.push_str("\n## Feats\n\n");
        if let Some(Value::List(feats)) = character.properties.get("feats_selected") {
            for feat in feats {
                if let Value::Str(feat_name) = feat {
                    md.push_str(&format!("- {}\n", feat_name));
                }
            }
        } else {
            md.push_str("_No feats selected._\n");
        }

        Ok(md)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine::character::CreateCharacter;

    #[test]
    fn test_export_character_json() {
        let mut engine = Engine::new();
        let char_id = CreateCharacter::execute(&mut engine, "Kira");

        let json = ExportCharacterJson::execute(&engine, &char_id).unwrap();
        let value: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(value.is_object());
        assert_eq!(
            value.get("name").and_then(|v| v.as_str()),
            Some("Kira")
        );
    }

    #[test]
    fn test_export_character_markdown() {
        let mut engine = Engine::new();
        let char_id = CreateCharacter::execute(&mut engine, "Tordek");

        let md = ExportCharacterMarkdown::execute(&engine, &char_id).unwrap();
        assert!(md.contains("# Tordek"));
        assert!(md.contains("**Race:**"));
        assert!(md.contains("## Ability Scores"));
        assert!(md.contains("## Skills"));
        assert!(md.contains("## Feats"));
    }
}
