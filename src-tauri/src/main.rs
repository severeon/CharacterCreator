// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod entity;
mod ipc;
mod pack_loader;
mod store;

use std::sync::Mutex;
use store::EntityStore;

fn main() {
    // Try to load the SRD content pack from the expected location
    let pack_dir = std::env::current_dir()
        .unwrap_or_default()
        .join("content/packs/srd-3.5e");

    let entity_store = if pack_dir.exists() {
        let entities = pack_loader::load_entities(&pack_dir);
        let count = entities.len();
        eprintln!("Loaded {} entities from {:?}", count, pack_dir);
        EntityStore::from_entities(entities)
    } else {
        eprintln!(
            "Warning: content pack not found at {:?}, starting with empty store",
            pack_dir
        );
        EntityStore::new()
    };

    tauri::Builder::default()
        .manage(Mutex::new(entity_store))
        .invoke_handler(tauri::generate_handler![
            ipc::get_entities_by_type,
            ipc::get_entity_by_id,
            ipc::search_entities,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
