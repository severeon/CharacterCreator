use std::collections::HashMap;
use uuid::Uuid;

use crate::dispatch::Dispatcher;
use crate::entity::{Entity, EntitySummary, Value};
use crate::event::EventBuilder;
use crate::queue::{Changeset, QueueManager};
use crate::workflow::{create_character_creation_workflow, WorkflowEngine};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DMSettings {
    pub ability_method: String,
    pub max_ability_score: i32,
    pub gestalt_required: bool,
    pub no_templates: bool,
    pub max_ecl: i32,
    pub no_racial_hd: bool,
    pub enforce_prerequisites: bool,
    pub notes: String,
    pub restricted_entities: Vec<String>,
}

impl Default for DMSettings {
    fn default() -> Self {
        Self {
            ability_method: "pointbuy".to_string(),
            max_ability_score: 18,
            gestalt_required: false,
            no_templates: false,
            max_ecl: 20,
            no_racial_hd: false,
            enforce_prerequisites: false,
            notes: String::new(),
            restricted_entities: vec![],
        }
    }
}

pub struct Engine {
    entities: HashMap<String, Entity>,
    queue_manager: QueueManager,
    dispatcher: Dispatcher,
    workflow_engine: WorkflowEngine,
    active_character_id: Option<String>,
    completed_workflow_steps: HashMap<String, Vec<String>>,
    active_queues: HashMap<String, Uuid>,
    dm_settings: DMSettings,
}

impl Engine {
    pub fn new() -> Self {
        let mut engine = Self {
            entities: HashMap::new(),
            queue_manager: QueueManager::new(),
            dispatcher: Dispatcher::new(),
            workflow_engine: WorkflowEngine::new(),
            active_character_id: None,
            completed_workflow_steps: HashMap::new(),
            active_queues: HashMap::new(),
            dm_settings: DMSettings::default(),
        };
        engine
            .workflow_engine
            .register(create_character_creation_workflow());
        engine
    }

    pub fn get_dm_settings(&self) -> DMSettings {
        self.dm_settings.clone()
    }

    pub fn set_dm_settings(&mut self, settings: DMSettings) {
        self.dm_settings = settings;
    }

    pub fn export_character_json(&self, character_id: &str) -> Result<String, String> {
        let character = self
            .entities
            .get(character_id)
            .ok_or_else(|| format!("Character not found: {}", character_id))?;

        serde_json::to_string_pretty(&character.properties)
            .map_err(|e| format!("Failed to serialize: {}", e))
    }

    pub fn export_character_markdown(&self, character_id: &str) -> Result<String, String> {
        let character = self
            .entities
            .get(character_id)
            .ok_or_else(|| format!("Character not found: {}", character_id))?;

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
        md.push_str(&format!("**Race:** {} | **Class:** {} | **Level:** {}\n\n", race, class_name, level));

        // Ability Scores
        md.push_str("## Ability Scores\n\n");
        md.push_str("| Ability | Score | Modifier |\n");
        md.push_str("|---------|-------|----------|\n");
        for ability in &["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] {
            let score = character
                .properties
                .get(&format!("abilities.{}.score", ability))
                .and_then(|v| match v { Value::Int(i) => Some(*i as i64), _ => None })
                .unwrap_or(10);
            let modifier = (score - 10) / 2;
            let mod_str = if modifier >= 0 { format!("+{}", modifier) } else { format!("{}", modifier) };
            let ability_label = ability.chars().next().unwrap().to_uppercase().to_string()
                + &ability.chars().skip(1).collect::<String>();
            md.push_str(&format!("| {} | {} | {} |\n", ability_label, score, mod_str));
        }

        // Skills
        md.push_str("\n## Skills\n\n");
        let mut skills: Vec<(&str, i64)> = Vec::new();
        for (key, val) in &character.properties {
            if key.starts_with("skills.") && key.ends_with(".ranks") {
                if let Value::Int(rank) = val {
                    let skill_name = key.strip_prefix("skills.").unwrap().strip_suffix(".ranks").unwrap();
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

    pub fn load_entities(&mut self, entities: HashMap<String, Entity>) {
        for (id, entity) in entities {
            self.entities.insert(id, entity);
        }
    }

    pub fn get_entity(&self, id: &str) -> Option<&Entity> {
        self.entities.get(id)
    }

    pub fn get_entity_mut(&mut self, id: &str) -> Option<&mut Entity> {
        self.entities.get_mut(id)
    }

    pub fn create_character(&mut self, name: &str) -> String {
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
        self.entities.insert(id.clone(), character);
        self.active_character_id = Some(id.clone());
        id
    }

    pub fn update_character_identity(
        &mut self,
        character_id: &str,
        identity: HashMap<String, Value>,
    ) -> Result<(), String> {
        let character = self
            .entities
            .get_mut(character_id)
            .ok_or_else(|| format!("Character not found: {}", character_id))?;

        for (key, value) in identity {
            character.set_property(&key, value);
        }

        let timestamp = self.queue_manager.next_timestamp();
        let queue_id = self.queue_manager.create_root_queue();

        let event = EventBuilder::new("identity.updated", character_id, queue_id, timestamp)
            .target(character_id)
            .build();

        let mut changeset = Changeset::new();
        self.dispatcher.dispatch(
            &event,
            &mut self.entities,
            &self.queue_manager,
            &mut changeset,
        );

        self.queue_manager.commit_queue(&queue_id);

        Ok(())
    }

    pub fn select_race(&mut self, character_id: &str, race_id: &str) -> Result<(), String> {
        let race = self
            .entities
            .get(race_id)
            .ok_or_else(|| format!("Race not found: {}", race_id))?
            .clone();

        {
            let character = self
                .entities
                .get_mut(character_id)
                .ok_or_else(|| format!("Character not found: {}", character_id))?;

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

        let timestamp = self.queue_manager.next_timestamp();
        let queue_id = self.queue_manager.create_root_queue();

        let event = EventBuilder::new("race.selected", race_id, queue_id, timestamp)
            .target(character_id)
            .payload("race_id", Value::Str(race_id.to_string()))
            .build();

        let mut changeset = Changeset::new();
        self.dispatcher.dispatch(
            &event,
            &mut self.entities,
            &self.queue_manager,
            &mut changeset,
        );

        self.queue_manager.commit_queue(&queue_id);

        self.completed_workflow_steps
            .entry(character_id.to_string())
            .or_insert_with(Vec::new)
            .push("select-race".to_string());

        Ok(())
    }

    pub fn select_class(
        &mut self,
        character_id: &str,
        class_id: &str,
        level: i32,
        slot: &str,
    ) -> Result<(), String> {
        let class_entity = self
            .entities
            .get(class_id)
            .ok_or_else(|| format!("Class not found: {}", class_id))?
            .clone();

        let prefix = if slot == "B" { "class_b" } else { "class" };

        {
            let character = self
                .entities
                .get_mut(character_id)
                .ok_or_else(|| format!("Character not found: {}", character_id))?;

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
            if let Some(sp) = class_entity.properties.get("skill_points").cloned() {
                character
                    .properties
                    .insert(format!("{}.skill_points", prefix), sp);
            }
            // Also set legacy properties for non-gestalt compatibility
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
                    character.properties.insert("base_attack_bonus".to_string(), bab);
                }
                if let Some(sp) = class_entity.properties.get("skill_points").cloned() {
                    character.properties.insert("skill_points_per_level".to_string(), sp);
                }
            }
        }

        let timestamp = self.queue_manager.next_timestamp();
        let queue_id = self.queue_manager.create_root_queue();

        let event = EventBuilder::new("class.selected", class_id, queue_id, timestamp)
            .target(character_id)
            .payload("class_id", Value::Str(class_id.to_string()))
            .payload("level", Value::Int(level as i64))
            .build();

        let mut changeset = Changeset::new();
        self.dispatcher.dispatch(
            &event,
            &mut self.entities,
            &self.queue_manager,
            &mut changeset,
        );

        self.queue_manager.commit_queue(&queue_id);

        self.completed_workflow_steps
            .entry(character_id.to_string())
            .or_insert_with(Vec::new)
            .push("select-class".to_string());

        Ok(())
    }

    pub fn assign_ability_scores(
        &mut self,
        character_id: &str,
        scores: HashMap<String, i64>,
    ) -> Result<(), String> {
        let character = self
            .entities
            .get_mut(character_id)
            .ok_or_else(|| format!("Character not found: {}", character_id))?;

        let mut score_values = std::collections::HashMap::new();
        for (ability, score) in &scores {
            let path = format!("abilities.{}.score", ability);
            character.set_property(&path, Value::Int(*score));
            score_values.insert(ability.clone(), Value::Int(*score));

            let mod_path = format!("abilities.{}.modifier", ability);
            let modifier = (*score - 10) / 2;
            character.set_property(&mod_path, Value::Int(modifier));
        }

        let timestamp = self.queue_manager.next_timestamp();
        let queue_id = self.queue_manager.create_root_queue();

        let mut payload = std::collections::HashMap::new();
        for (ability, value) in &score_values {
            payload.insert(
                ability.clone(),
                value.clone(),
            );
        }

        let event = EventBuilder::new("abilities.assigned", character_id, queue_id, timestamp)
            .target(character_id)
            .payload("scores", Value::Map(payload))
            .build();

        let mut changeset = Changeset::new();
        self.dispatcher.dispatch(
            &event,
            &mut self.entities,
            &self.queue_manager,
            &mut changeset,
        );

        self.queue_manager.commit_queue(&queue_id);

        self.completed_workflow_steps
            .entry(character_id.to_string())
            .or_insert_with(Vec::new)
            .push("assign-ability-scores".to_string());

        Ok(())
    }

    pub fn allocate_skill_points(
        &mut self,
        character_id: &str,
        skill_allocations: HashMap<String, i64>,
    ) -> Result<(), String> {
        // Get class_id and level from character first (immutable reads)
        let (class_id, remaining, level) = {
            let character = self
                .entities
                .get(character_id)
                .ok_or_else(|| "Character not found".to_string())?;
            let remaining = character
                .properties
                .get("skill_points_remaining")
                .and_then(|v| v.as_int())
                .unwrap_or(0);
            let class_id = character
                .properties
                .get("class")
                .and_then(|v| v.as_str())
                .ok_or_else(|| "No class selected".to_string())?;
            let level = character
                .properties
                .get("level")
                .and_then(|v| v.as_int())
                .unwrap_or(1) as i64;
            (class_id.to_string(), remaining, level)
        };

        let class_skills: Vec<String> = self
            .entities
            .get(&class_id)
            .ok_or_else(|| format!("Class not found: {}", class_id))?
            .properties
            .get("classSkills")
            .and_then(|v| v.as_list())
            .map(|list| {
                list.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default();

        let mut total_cost = 0i64;
        let mut new_ranks = HashMap::new();

        // Pre-compute current ranks (immutable read)
        let current_ranks: HashMap<String, i64> = {
            let character = self.entities.get(character_id).unwrap();
            skill_allocations
                .keys()
                .filter(|k| *k != "")
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

        for (skill, ranks_delta) in &skill_allocations {
            if *ranks_delta == 0 {
                continue;
            }

            let current = *current_ranks.get(skill).unwrap_or(&0);
            let is_class_skill = class_skills
                .iter()
                .any(|cs| cs.to_lowercase() == skill.to_lowercase());
            let cost_per_rank = if is_class_skill { 1 } else { 2 };

            let max_ranks = if is_class_skill { level } else { level / 2 };
            if current + *ranks_delta > max_ranks {
                return Err(format!(
                    "Cannot add {} ranks to {} (max {} for {} skill at level {})",
                    ranks_delta,
                    skill,
                    max_ranks,
                    if is_class_skill { "class" } else { "cross-class" },
                    level
                ));
            }
            if current + *ranks_delta < 0 {
                return Err(format!("Cannot reduce {} below 0", skill));
            }

            total_cost += ranks_delta * cost_per_rank;
            new_ranks.insert(skill.clone(), current + *ranks_delta);
        }

        if total_cost > remaining {
            return Err(format!(
                "Not enough skill points (need {}, have {})",
                total_cost, remaining
            ));
        }

        // Now mutable borrow for writing
        let character = self
            .entities
            .get_mut(character_id)
            .ok_or_else(|| "Character not found".to_string())?;

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

        let timestamp = self.queue_manager.next_timestamp();
        let queue_id = self.queue_manager.create_root_queue();

        let mut allocation_values = std::collections::HashMap::new();
        for (skill, ranks) in &new_ranks {
            allocation_values.insert(skill.clone(), Value::Int(*ranks));
        }

        let event = EventBuilder::new("skills.allocated", character_id, queue_id, timestamp)
            .target(character_id)
            .payload("allocations", Value::Map(allocation_values))
            .build();

        let mut changeset = Changeset::new();
        self.dispatcher.dispatch(
            &event,
            &mut self.entities,
            &self.queue_manager,
            &mut changeset,
        );

        self.queue_manager.commit_queue(&queue_id);

        self.completed_workflow_steps
            .entry(character_id.to_string())
            .or_insert_with(Vec::new)
            .push("allocate-skills".to_string());

        Ok(())
    }

    pub fn get_available_choices(&self, _character_id: &str, slot_type: &str) -> Vec<Entity> {
        self.entities
            .values()
            .filter(|e| e.entity_type == slot_type)
            .cloned()
            .collect()
    }

    pub fn get_entities_by_type(&self, entity_type: &str) -> Vec<EntitySummary> {
        let mut results: Vec<EntitySummary> = self
            .entities
            .values()
            .filter(|e| e.entity_type == entity_type)
            .map(|e| e.to_summary())
            .collect();
        results.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        results
    }

    pub fn search_entities(&self, query: &str) -> Vec<EntitySummary> {
        let q = query.to_lowercase();
        let mut results: Vec<EntitySummary> = self
            .entities
            .values()
            .filter(|e| {
                let name = match e.properties.get("name") {
                    Some(Value::Str(s)) => s.to_lowercase(),
                    _ => String::new(),
                };
                if name.contains(&q) {
                    return true;
                }
                e.tags.iter().any(|t| t.to_lowercase().contains(&q))
            })
            .map(|e| e.to_summary())
            .collect();
        results.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        results
    }

    /// Returns the speculative state of a character entity.
    /// If queue_id is provided, returns snapshot + changeset overlay from that queue.
    /// Otherwise, uses the active queue for this character, or falls back to committed state.
    pub fn get_speculative_state(&self, character_id: &str, queue_id: Option<&str>) -> Option<Entity> {
        let resolved_queue_id = if let Some(qid) = queue_id {
            Uuid::parse_str(qid).ok()
        } else {
            self.active_queues.get(character_id).copied()
        };

        let queue_id = match resolved_queue_id {
            Some(qid) => qid,
            None => return self.get_entity(character_id).cloned(),
        };

        let queue = self.queue_manager.get_queue(&queue_id)?;

        // Start from snapshot if available
        let base = match &queue.snapshot {
            Some(snapshot) => snapshot.entities.get(character_id)?.clone(),
            None => self.get_entity(character_id)?.clone(),
        };

        // Overlay changeset entries for this character
        let mut result = base;
        for entry in &queue.changeset.entries {
            if entry.entity_id == character_id {
                if let Some(new_val) = &entry.new_value {
                    result.set_property(&entry.path, new_val.clone());
                } else {
                    result.properties.remove(&entry.path);
                }
            }
        }

        Some(result)
    }

    pub fn select_feat(&mut self, character_id: &str, feat_id: &str) -> Result<(), String> {
        // Validate feat exists and get character state (immutable reads)
        let (slots_available, existing_feats) = {
            let _ = self
                .entities
                .get(feat_id)
                .ok_or_else(|| format!("Feat not found: {}", feat_id))?;

            let character = self
                .entities
                .get(character_id)
                .ok_or_else(|| "Character not found".to_string())?;

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
            return Err("No feat slots remaining".to_string());
        }

        if existing_feats.contains(&feat_id.to_string()) {
            return Err("Feat already selected".to_string());
        }

        // Mutable borrow for writing
        let character = self
            .entities
            .get_mut(character_id)
            .ok_or_else(|| "Character not found".to_string())?;

        let mut feats_list = existing_feats;
        feats_list.push(feat_id.to_string());
        character.set_property(
            "feats_selected",
            Value::List(feats_list.iter().map(|s| Value::Str(s.clone())).collect()),
        );
        character.set_property("feat_slots_remaining", Value::Int(slots_available - 1));

        let timestamp = self.queue_manager.next_timestamp();
        let queue_id = self.queue_manager.create_root_queue();

        let event = EventBuilder::new("feat.selected", feat_id, queue_id, timestamp)
            .target(character_id)
            .payload("feat_id", Value::Str(feat_id.to_string()))
            .build();

        let mut changeset = Changeset::new();
        self.dispatcher.dispatch(
            &event,
            &mut self.entities,
            &self.queue_manager,
            &mut changeset,
        );

        self.queue_manager.commit_queue(&queue_id);

        // select-feats is repeatable, don't mark as completed permanently
        // but track that a selection was made this session
        self.completed_workflow_steps
            .entry(character_id.to_string())
            .or_insert_with(Vec::new)
            .push("select-feats".to_string());

        Ok(())
    }

    pub fn get_available_feats(&self, character_id: &str) -> Vec<Entity> {
        let character = match self.entities.get(character_id) {
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

        self.entities
            .values()
            .filter(|e| {
                e.entity_type == "feat" && !selected_ids.contains(&e.id)
            })
            .cloned()
            .collect()
    }

    pub fn get_workflow_status(&self, character_id: &str, workflow_id: &str) -> WorkflowStatus {
        let completed = self
            .completed_workflow_steps
            .get(character_id)
            .cloned()
            .unwrap_or_default();

        let pending = self.workflow_engine.get_next_steps(
            workflow_id,
            &completed,
            self.entities.get(character_id).unwrap_or(&Entity {
                id: String::new(),
                entity_type: String::new(),
                properties: HashMap::new(),
                tags: vec![],
                mdx_body: String::new(),
                source_pack: String::new(),
                subscriptions: vec![],
                computed_views: vec![],
                prototype: None,
            }),
        );

        WorkflowStatus {
            completed,
            pending,
            available: vec![],
        }
    }
}

fn skill_to_ability_key(skill: &str) -> String {
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

impl Default for Engine {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct WorkflowStatus {
    pub completed: Vec<String>,
    pub pending: Vec<String>,
    pub available: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_engine_create_character() {
        let mut engine = Engine::new();
        let id = engine.create_character("Thorin");
        assert!(!id.is_empty());

        let character = engine.get_entity(&id).unwrap();
        assert_eq!(
            character.properties.get("name"),
            Some(&Value::Str("Thorin".to_string()))
        );
    }

    #[test]
    fn test_engine_assign_ability_scores() {
        let mut engine = Engine::new();
        let id = engine.create_character("Thorin");

        let mut scores = HashMap::new();
        scores.insert("strength".to_string(), 16);
        scores.insert("dexterity".to_string(), 14);

        engine.assign_ability_scores(&id, scores).unwrap();

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

    #[test]
    fn test_workflow_status() {
        let engine = Engine::new();
        let status = engine.get_workflow_status("char1", "srd:workflow:character_creation");
        assert!(status.completed.is_empty());
        assert!(!status.pending.is_empty());
    }

    #[test]
    fn test_select_feat_consumes_slot() {
        let mut engine = Engine::new();
        let char_id = engine.create_character("Thorin");

        // Insert a feat so the engine knows about it
        let feat = Entity {
            id: "srd:feat:power-attack".to_string(),
            entity_type: "feat".to_string(),
            properties: {
                let mut p = HashMap::new();
                p.insert("name".to_string(), Value::Str("Power Attack".to_string()));
                p
            },
            tags: vec![],
            mdx_body: String::new(),
            source_pack: "srd-3.5e".to_string(),
            subscriptions: vec![],
            computed_views: vec![],
            prototype: None,
        };
        engine.entities.insert(feat.id.clone(), feat);

        {
            let character = engine.entities.get_mut(&char_id).unwrap();
            character.set_property("feat_slots_remaining", Value::Int(1));
        }

        engine.select_feat(&char_id, "srd:feat:power-attack").unwrap();

        let character = engine.entities.get(&char_id).unwrap();
        assert_eq!(
            character.get_property("feat_slots_remaining"),
            Some(&Value::Int(0))
        );
        assert!(character.get_property("feats_selected").is_some());
    }

    #[test]
    fn test_get_available_feats_excludes_selected() {
        let mut engine = Engine::new();
        let char_id = engine.create_character("Thorin");

        {
            let character = engine.entities.get_mut(&char_id).unwrap();
            character.set_property("feat_slots_remaining", Value::Int(1));
        }

        let available = engine.get_available_feats(&char_id);
        let feat_ids: Vec<&str> = available.iter().map(|e| e.id.as_str()).collect();
        assert!(!feat_ids.contains(&"srd:feat:power-attack"));

        // Manually add a feat to the store first
        let feat = Entity {
            id: "srd:feat:power-attack".to_string(),
            entity_type: "feat".to_string(),
            properties: {
                let mut p = HashMap::new();
                p.insert("name".to_string(), Value::Str("Power Attack".to_string()));
                p
            },
            tags: vec![],
            mdx_body: String::new(),
            source_pack: "srd-3.5e".to_string(),
            subscriptions: vec![],
            computed_views: vec![],
            prototype: None,
        };
        engine.entities.insert(feat.id.clone(), feat);

        let available = engine.get_available_feats(&char_id);
        let feat_ids: Vec<&str> = available.iter().map(|e| e.id.as_str()).collect();
        assert!(feat_ids.contains(&"srd:feat:power-attack"));
    }

    #[test]
    fn test_allocate_skill_points_class_skill() {
        let mut engine = Engine::new();
        let char_id = engine.create_character("Thorin");

        // Create a fighter class entity with classSkills
        let fighter = Entity {
            id: "srd:class:fighter".to_string(),
            entity_type: "class".to_string(),
            properties: {
                let mut p = HashMap::new();
                p.insert("name".to_string(), Value::Str("Fighter".to_string()));
                p.insert(
                    "classSkills".to_string(),
                    Value::List(vec![
                        Value::Str("Climb".to_string()),
                        Value::Str("Craft".to_string()),
                        Value::Str("Handle Animal".to_string()),
                        Value::Str("Intimidate".to_string()),
                        Value::Str("Jump".to_string()),
                        Value::Str("Knowledge(Dungeoneering)".to_string()),
                        Value::Str("Ride".to_string()),
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

        // Setup: select class
        engine.select_class(&char_id, "srd:class:fighter", 1, "A").unwrap();

        // Set skill points remaining
        {
            let char = engine.entities.get_mut(&char_id).unwrap();
            char.set_property("skill_points_remaining", Value::Int(4));
        }

        // Allocate 1 rank to Climb (Fighter class skill, max rank at level 1 = 1)
        let mut allocations = HashMap::new();
        allocations.insert("Climb".to_string(), 1);

        engine.allocate_skill_points(&char_id, allocations).unwrap();

        let character = engine.entities.get(&char_id).unwrap();
        assert_eq!(
            character.get_property("skills.Climb.ranks"),
            Some(&Value::Int(1))
        );
        assert_eq!(
            character.get_property("skill_points_remaining"),
            Some(&Value::Int(3))
        ); // 4 - 1 = 3
    }

    #[test]
    fn test_get_speculative_state_from_queue() {
        let mut engine = Engine::new();
        let char_id = engine.create_character("Thorin");

        // Create root queue and a child queue
        let root_id = engine.queue_manager.create_root_queue();
        let queue_id = engine.queue_manager.create_child_queue(root_id).unwrap();

        // Take snapshot and then record a change in the queue's changeset
        let timestamp = engine.queue_manager.next_timestamp();
        {
            let queue = engine.queue_manager.get_queue_mut(&queue_id).unwrap();
            queue.take_snapshot(&engine.entities, timestamp);
            // Record the change so it appears in the changeset overlay
            queue.record_change(&char_id, "test.prop", None, Some(Value::Int(42)));
        }

        // Get speculative state from queue (should reflect snapshot + changeset overlay)
        let state = engine.get_speculative_state(&char_id, Some(&queue_id.to_string()));
        assert!(state.is_some());
        assert_eq!(state.unwrap().get_property("test.prop"), Some(&Value::Int(42)));
    }

    #[test]
    fn test_update_character_identity() {
        let mut engine = Engine::new();
        let char_id = engine.create_character("Tordek");

        let mut identity = HashMap::new();
        identity.insert("player_name".to_string(), Value::Str("Alice".to_string()));
        identity.insert("alignment".to_string(), Value::Str("lawful-good".to_string()));
        identity.insert("age".to_string(), Value::Int(45));
        identity.insert("height".to_string(), Value::Int(58));
        identity.insert("weight".to_string(), Value::Int(180));

        engine.update_character_identity(&char_id, identity).unwrap();

        let character = engine.entities.get(&char_id).unwrap();
        assert_eq!(
            character.get_property("player_name"),
            Some(&Value::Str("Alice".to_string()))
        );
        assert_eq!(
            character.get_property("alignment"),
            Some(&Value::Str("lawful-good".to_string()))
        );
        assert_eq!(
            character.get_property("age"),
            Some(&Value::Int(45))
        );
        assert_eq!(
            character.get_property("height"),
            Some(&Value::Int(58))
        );
        assert_eq!(
            character.get_property("weight"),
            Some(&Value::Int(180))
        );
    }

    #[test]
    fn test_select_class_gestalt() {
        let mut engine = Engine::new();

        // Create a second class for gestalt
        let wizard = Entity {
            id: "srd:class:wizard".to_string(),
            entity_type: "class".to_string(),
            properties: {
                let mut p = HashMap::new();
                p.insert("name".to_string(), Value::Str("Wizard".to_string()));
                p.insert("hd".to_string(), Value::Int(4));
                p.insert("bab".to_string(), Value::Str("weak".to_string()));
                p.insert("skill_points".to_string(), Value::Int(2));
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
                let mut p = HashMap::new();
                p.insert("name".to_string(), Value::Str("Fighter".to_string()));
                p.insert("hd".to_string(), Value::Int(10));
                p.insert("bab".to_string(), Value::Str("good".to_string()));
                p.insert("skill_points".to_string(), Value::Int(4));
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

        let char_id = engine.create_character("Kira");

        // Select Fighter as Class A
        engine.select_class(&char_id, "srd:class:fighter", 1, "A").unwrap();

        let character = engine.entities.get(&char_id).unwrap();
        assert_eq!(
            character.get_property("class.id"),
            Some(&Value::Str("srd:class:fighter".to_string()))
        );
        assert_eq!(
            character.get_property("class.name"),
            Some(&Value::Str("Fighter".to_string()))
        );
        // Legacy properties still set for non-gestalt
        assert_eq!(
            character.get_property("class"),
            Some(&Value::Str("srd:class:fighter".to_string()))
        );

        // Select Wizard as Class B (gestalt)
        engine.select_class(&char_id, "srd:class:wizard", 1, "B").unwrap();

        let character = engine.entities.get(&char_id).unwrap();
        // Class B stored with prefix
        assert_eq!(
            character.get_property("class_b.id"),
            Some(&Value::Str("srd:class:wizard".to_string()))
        );
        assert_eq!(
            character.get_property("class_b.name"),
            Some(&Value::Str("Wizard".to_string()))
        );
        // Original Class A preserved
        assert_eq!(
            character.get_property("class.id"),
            Some(&Value::Str("srd:class:fighter".to_string()))
        );
        // Legacy properties unchanged
        assert_eq!(
            character.get_property("class"),
            Some(&Value::Str("srd:class:fighter".to_string()))
        );
    }

    #[test]
    fn test_workflow_status_after_identity_update() {
        let mut engine = Engine::new();

        // Create a human race entity for the test
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

        let char_id = engine.create_character("Bruenor");

        // Initial workflow status - select-race should be pending
        let status = engine.get_workflow_status(&char_id, "srd:workflow:character_creation");
        assert!(status.pending.contains(&"select-race".to_string()));
        assert!(status.completed.is_empty());

        // After race selection, select-class should be pending
        engine.select_race(&char_id, "srd:race:human").unwrap();
        let status = engine.get_workflow_status(&char_id, "srd:workflow:character_creation");
        assert!(status.completed.contains(&"select-race".to_string()));
        assert!(status.pending.contains(&"select-class".to_string()));
    }

    #[test]
    fn test_dm_settings() {
        let mut engine = Engine::new();

        // Default settings
        let settings = engine.get_dm_settings();
        assert_eq!(settings.ability_method, "pointbuy");
        assert_eq!(settings.max_ability_score, 18);
        assert!(!settings.gestalt_required);
        assert!(!settings.no_templates);

        // Update settings
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

    #[test]
    fn test_export_character_json() {
        let mut engine = Engine::new();
        let char_id = engine.create_character("Kira");

        let json = engine.export_character_json(&char_id).unwrap();

        // Verify it's valid JSON and contains expected fields
        let value: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert!(value.is_object());
        let obj = value.as_object().unwrap();
        assert_eq!(obj.get("name").and_then(|v| v.as_str()), Some("Kira"));
    }

    #[test]
    fn test_export_character_markdown() {
        let mut engine = Engine::new();
        let char_id = engine.create_character("Tordek");

        let md = engine.export_character_markdown(&char_id).unwrap();

        // Verify it contains expected sections
        assert!(md.contains("# Tordek"));
        assert!(md.contains("**Race:**"));
        assert!(md.contains("## Ability Scores"));
        assert!(md.contains("| Strength |"));
        assert!(md.contains("## Skills"));
        assert!(md.contains("## Feats"));
    }
}
