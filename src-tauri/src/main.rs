// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod computed_view;
mod dispatch;
mod engine;
mod entity;
mod event;
mod ipc;
mod operation;
mod pack_loader;
mod queue;
mod store;
mod subscription;
mod workflow;

use engine::Engine;
use std::env;
use std::path::PathBuf;
use std::sync::Mutex;

fn find_content_dir() -> PathBuf {
    if let Ok(custom) = env::var("CONTENT_DIR") {
        return PathBuf::from(custom);
    }

    let exe_dir = env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()));

    let cwd = env::current_dir().unwrap_or_default();
    let mut search_paths = Vec::new();

    if let Some(ref exe) = exe_dir {
        search_paths.push(exe.join("content/packs/srd-3.5e"));
        search_paths.push(exe.join("../../content/packs/srd-3.5e"));
        search_paths.push(exe.join("../../../content/packs/srd-3.5e"));
        search_paths.push(exe.join("../../../../content/packs/srd-3.5e"));
    }

    search_paths.push(cwd.join("content/packs/srd-3.5e"));
    search_paths.push(cwd.join("../content/packs/srd-3.5e"));
    search_paths.push(cwd.join("../../content/packs/srd-3.5e"));

    for path in search_paths {
        if path.exists() {
            return path;
        }
    }

    cwd.join("content/packs/srd-3.5e")
}

fn main() {
    let pack_dir = find_content_dir();

    let mut engine = Engine::new();

    if pack_dir.exists() {
        let entities = pack_loader::load_entities(&pack_dir);
        let count = entities.len();
        eprintln!("Loaded {} entities from {:?}", count, pack_dir);
        engine.load_entities(entities);
    } else {
        eprintln!(
            "Warning: content pack not found at {:?}, starting with empty store",
            pack_dir
        );
    }

    let builder = tauri::Builder::default()
        .manage(Mutex::new(engine))
        .invoke_handler(tauri::generate_handler![
            ipc::get_entities_by_type,
            ipc::get_entity_by_id,
            ipc::search_entities,
            ipc::create_character,
            ipc::update_character_identity,
            ipc::select_race,
            ipc::select_class,
            ipc::assign_ability_scores,
            ipc::allocate_skill_points,
            ipc::get_workflow_status,
            ipc::get_available_choices,
            ipc::get_speculative_state,
            ipc::select_feat,
            ipc::get_available_feats,
            ipc::get_dm_settings,
            ipc::set_dm_settings,
            ipc::export_character_json,
            ipc::export_character_markdown,
        ]);

    #[cfg(debug_assertions)]
    let builder = builder.plugin(tauri_plugin_mcp_bridge::init());

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
