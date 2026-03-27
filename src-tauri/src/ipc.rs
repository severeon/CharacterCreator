use std::sync::Mutex;
use tauri::State;

use crate::entity::{Entity, EntitySummary};
use crate::store::EntityStore;

#[tauri::command]
pub fn get_entities_by_type(
    entity_type: String,
    store: State<'_, Mutex<EntityStore>>,
) -> Vec<EntitySummary> {
    let store = store.lock().unwrap();
    store.get_by_type(&entity_type)
}

#[tauri::command]
pub fn get_entity_by_id(
    id: String,
    store: State<'_, Mutex<EntityStore>>,
) -> Option<Entity> {
    let store = store.lock().unwrap();
    store.get_by_id(&id).cloned()
}

#[tauri::command]
pub fn search_entities(
    query: String,
    store: State<'_, Mutex<EntityStore>>,
) -> Vec<EntitySummary> {
    let store = store.lock().unwrap();
    store.search(&query)
}
