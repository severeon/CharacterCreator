use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

use crate::engine::{Engine, WorkflowStatus};
use crate::entity::{Entity, EntitySummary};

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
    engine: State<'_, Mutex<Engine>>,
) -> Result<(), String> {
    let mut engine = engine.lock().unwrap();
    engine.select_class(&character_id, &class_id, level)
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
