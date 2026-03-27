// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod entity;
mod ipc;
mod pack_loader;
mod store;

use std::env;
use std::path::PathBuf;
use std::sync::Mutex;
use store::EntityStore;

fn find_content_dir() -> PathBuf {
    if let Ok(custom) = env::var("CONTENT_DIR") {
        return PathBuf::from(custom);
    }
    let cwd = env::current_dir().unwrap_or_default();
    let parent = cwd.parent().unwrap_or(&cwd);

    let project_root = parent.join("content/packs/srd-3.5e");
    if project_root.exists() {
        return project_root;
    }

    cwd.join("content/packs/srd-3.5e")
}

fn main() {
    let pack_dir = find_content_dir();

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
