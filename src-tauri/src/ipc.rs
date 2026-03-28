use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

use crate::engine::{DMSettings, Engine, WorkflowStatus};
use crate::entity::{Entity, EntitySummary, Value};

#[tauri::command]
pub fn get_entities_by_type(
    entity_type: String,
    engine: State<'_, Mutex<Engine>>,
) -> Vec<EntitySummary> {
    let engine = engine.lock().unwrap();
    engine.get_entities_by_type(&entity_type)
}

#[tauri::command]
pub fn get_entity_by_id(id: String, engine: State<'_, Mutex<Engine>>) -> Option<Entity> {
    let engine = engine.lock().unwrap();
    engine.get_entity(&id).cloned()
}

#[tauri::command]
pub fn search_entities(query: String, engine: State<'_, Mutex<Engine>>) -> Vec<EntitySummary> {
    let engine = engine.lock().unwrap();
    engine.search_entities(&query)
}

#[tauri::command]
pub fn create_character(name: String, engine: State<'_, Mutex<Engine>>) -> Result<String, String> {
    let mut engine = engine.lock().unwrap();
    Ok(engine.create_character(&name))
}

#[tauri::command]
pub fn update_character_identity(
    character_id: String,
    identity: HashMap<String, serde_json::Value>,
    engine: State<'_, Mutex<Engine>>,
) -> Result<(), String> {
    use crate::entity::Value;
    let mut engine = engine.lock().unwrap();
    let identity_value: HashMap<String, Value> = identity
        .into_iter()
        .map(|(k, v)| (k, serde_json_from_value(v)))
        .collect();
    engine.update_character_identity(&character_id, identity_value)
}

fn serde_json_from_value(v: serde_json::Value) -> Value {
    match v {
        serde_json::Value::Null => Value::Null,
        serde_json::Value::Bool(b) => Value::Bool(b),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Value::Int(i)
            } else if let Some(f) = n.as_f64() {
                Value::Float(f)
            } else {
                Value::Int(0)
            }
        }
        serde_json::Value::String(s) => Value::Str(s),
        serde_json::Value::Array(arr) => {
            Value::List(arr.into_iter().map(serde_json_from_value).collect())
        }
        serde_json::Value::Object(obj) => {
            Value::Map(obj.into_iter().map(|(k, v)| (k, serde_json_from_value(v))).collect())
        }
    }
}

#[tauri::command]
pub fn select_race(
    character_id: String,
    race_id: String,
    engine: State<'_, Mutex<Engine>>,
) -> Result<(), String> {
    let mut engine = engine.lock().unwrap();
    engine.select_race(&character_id, &race_id)
}

#[tauri::command]
pub fn select_class(
    character_id: String,
    class_id: String,
    level: i32,
    slot: Option<String>,
    engine: State<'_, Mutex<Engine>>,
) -> Result<(), String> {
    let mut engine = engine.lock().unwrap();
    engine.select_class(&character_id, &class_id, level, slot.as_deref().unwrap_or("A"))
}

#[tauri::command]
pub fn assign_ability_scores(
    character_id: String,
    scores: HashMap<String, i64>,
    engine: State<'_, Mutex<Engine>>,
) -> Result<(), String> {
    let mut engine = engine.lock().unwrap();
    engine.assign_ability_scores(&character_id, scores)
}

#[tauri::command]
pub fn allocate_skill_points(
    character_id: String,
    allocations: HashMap<String, i64>,
    engine: State<'_, Mutex<Engine>>,
) -> Result<(), String> {
    let mut engine = engine.lock().unwrap();
    engine.allocate_skill_points(&character_id, allocations)
}

#[tauri::command]
pub fn get_workflow_status(
    character_id: String,
    workflow_id: String,
    engine: State<'_, Mutex<Engine>>,
) -> WorkflowStatus {
    let engine = engine.lock().unwrap();
    engine.get_workflow_status(&character_id, &workflow_id)
}

#[tauri::command]
pub fn get_available_choices(
    character_id: String,
    slot_type: String,
    engine: State<'_, Mutex<Engine>>,
) -> Vec<Entity> {
    let engine = engine.lock().unwrap();
    engine.get_available_choices(&character_id, &slot_type)
}

#[tauri::command]
pub fn get_speculative_state(
    character_id: String,
    queue_id: Option<String>,
    engine: State<'_, Mutex<Engine>>,
) -> Option<Entity> {
    let engine = engine.lock().unwrap();
    engine.get_speculative_state(&character_id, queue_id.as_deref())
}

#[tauri::command]
pub fn select_feat(
    character_id: String,
    feat_id: String,
    engine: State<'_, Mutex<Engine>>,
) -> Result<(), String> {
    let mut engine = engine.lock().unwrap();
    engine.select_feat(&character_id, &feat_id)
}

#[tauri::command]
pub fn get_available_feats(
    character_id: String,
    engine: State<'_, Mutex<Engine>>,
) -> Vec<Entity> {
    let engine = engine.lock().unwrap();
    engine.get_available_feats(&character_id)
}

#[tauri::command]
pub fn get_dm_settings(engine: State<'_, Mutex<Engine>>) -> DMSettings {
    let engine = engine.lock().unwrap();
    engine.get_dm_settings()
}

#[tauri::command]
pub fn set_dm_settings(
    settings: DMSettings,
    engine: State<'_, Mutex<Engine>>,
) -> Result<(), String> {
    let mut engine = engine.lock().unwrap();
    engine.set_dm_settings(settings);
    Ok(())
}

#[tauri::command]
pub fn export_character_json(
    character_id: String,
    engine: State<'_, Mutex<Engine>>,
) -> Result<String, String> {
    let engine = engine.lock().unwrap();
    engine.export_character_json(&character_id)
}

#[tauri::command]
pub fn export_character_markdown(
    character_id: String,
    engine: State<'_, Mutex<Engine>>,
) -> Result<String, String> {
    let engine = engine.lock().unwrap();
    engine.export_character_markdown(&character_id)
}
