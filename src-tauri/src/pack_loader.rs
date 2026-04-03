use std::collections::HashMap;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

use crate::entity::Entity;
use crate::schema_validator;

/// Manifest data from a content pack's manifest.yaml.
#[derive(Debug, serde::Deserialize)]
pub struct Manifest {
    pub id: String,
    // Deserialized from YAML; not yet read in Rust — kept for future pack introspection.
    #[allow(dead_code)]
    pub name: String,
    #[allow(dead_code)]
    pub version: String,
    #[allow(dead_code)]
    #[serde(default)]
    pub pack_type: String,
    #[allow(dead_code)]
    #[serde(default)]
    pub dependencies: Vec<String>,
}

/// Load and parse the manifest.yaml from a pack directory.
pub fn load_manifest(pack_dir: &Path) -> Option<Manifest> {
    let manifest_path = pack_dir.join("manifest.yaml");
    let content = fs::read_to_string(&manifest_path).ok()?;
    serde_yaml::from_str(&content).ok()
}

/// Parse a single MDX file's content into an Entity.
/// Returns None if the frontmatter is missing or unparseable.
pub fn parse_mdx(content: &str, pack_id: &str, file_path: &Path) -> Option<Entity> {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return None;
    }

    // Find the closing --- delimiter (skip the opening one)
    let after_open = &trimmed[3..];
    let close_pos = after_open.find("---")?;
    let frontmatter = &after_open[..close_pos];
    let body = after_open[close_pos + 3..].trim().to_string();

    let mut entity: Entity = serde_yaml::from_str(frontmatter).ok()?;

    if entity.id.is_empty() && entity.entity_type.is_empty() {
        let _file_stem = file_path.file_stem()?.to_str()?;
        let parent_path = file_path.parent()?;
        let category = parent_path.file_name()?.to_str()?;
        let entity_type = parent_path.parent()?.file_name()?.to_str()?;

        if entity_type == "entities" {
            return None;
        }

        entity.id = format!("{}:{}:{}", pack_id, entity_type, category);
        entity.entity_type = entity_type.trim_end_matches('s').to_string();
    }

    entity.mdx_body = body;
    entity.source_pack = pack_id.to_string();

    Some(entity)
}

/// Walk the entities/ directory in a pack and load all .mdx files.
/// Returns a map of entity id -> Entity.
pub fn load_entities(pack_dir: &Path) -> HashMap<String, Entity> {
    let mut entities = HashMap::new();

    let manifest = match load_manifest(pack_dir) {
        Some(m) => m,
        None => {
            eprintln!("Warning: no valid manifest.yaml in {:?}", pack_dir);
            return entities;
        }
    };

    let entities_dir = pack_dir.join("entities");
    if !entities_dir.exists() {
        eprintln!("Warning: no entities/ directory in {:?}", pack_dir);
        return entities;
    }

    // Load schemas if schemas/ directory exists
    let schemas_dir = pack_dir.join("schemas");
    let schemas = if schemas_dir.exists() {
        schema_validator::load_schemas(&schemas_dir)
            .map_err(|e| eprintln!("Warning: failed to load schemas: {}", e))
            .ok()
    } else {
        None
    };

    for entry in WalkDir::new(&entities_dir)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "mdx") {
            if let Ok(content) = fs::read_to_string(path) {
                if let Some(entity) = parse_mdx(&content, &manifest.id, path) {
                    // Validate against schema if available
                    if let Some(ref schemas) = schemas {
                        if let Some(schema_yaml) = schemas.get(&entity.entity_type) {
                            // Extract frontmatter for validation
                            let frontmatter = extract_frontmatter(&content);
                            if let Some(fm) = frontmatter {
                                if let Err(err) = schema_validator::validate_entity(&fm, schema_yaml) {
                                    eprintln!(
                                        "Warning: entity {:?} failed validation: {}",
                                        entity.id, err
                                    );
                                }
                            }
                        }
                    }
                    entities.insert(entity.id.clone(), entity);
                }
            }
        }
    }

    entities
}

/// Extract frontmatter YAML from MDX content
fn extract_frontmatter(content: &str) -> Option<String> {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return None;
    }
    let after_open = &trimmed[3..];
    let close_pos = after_open.find("---")?;
    Some(after_open[..close_pos].to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entity::Value;
    use std::path::PathBuf;

    fn fixtures_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join("test-pack")
    }

    #[test]
    fn test_load_manifest() {
        let manifest = load_manifest(&fixtures_dir()).expect("should load manifest");
        assert_eq!(manifest.id, "test-pack");
        assert_eq!(manifest.name, "Test Content Pack");
        assert_eq!(manifest.version, "1.0.0");
    }

    #[test]
    fn test_parse_mdx_valid() {
        let content = r#"---
id: "test:class:wizard"
entity_type: class
properties:
  name: Wizard
  hd: 4
tags:
  - "source:phb"
---

## Wizard

A master of arcane magic.
"#;
        let entity = parse_mdx(
            content,
            "test-pack",
            Path::new("test-pack/entities/test/class/wizard.mdx"),
        )
        .expect("should parse");
        assert_eq!(entity.id, "test:class:wizard");
        assert_eq!(entity.entity_type, "class");
        assert_eq!(entity.source_pack, "test-pack");

        match entity.properties.get("name") {
            Some(Value::Str(s)) => assert_eq!(s, "Wizard"),
            other => panic!("expected Str, got {:?}", other),
        }
        match entity.properties.get("hd") {
            Some(Value::Int(n)) => assert_eq!(*n, 4),
            other => panic!("expected Int, got {:?}", other),
        }

        assert!(entity.mdx_body.contains("## Wizard"));
        assert!(entity.mdx_body.contains("arcane magic"));
    }

    #[test]
    fn test_parse_mdx_no_frontmatter() {
        let content = "Just some text without frontmatter.";
        assert!(parse_mdx(content, "test", Path::new("test/entity.mdx")).is_none());
    }

    #[test]
    fn test_parse_mdx_incomplete_frontmatter() {
        let content = "---\nid: broken\n";
        assert!(parse_mdx(content, "test", Path::new("test/entity.mdx")).is_none());
    }

    #[test]
    fn test_load_entities_from_fixtures() {
        let entities = load_entities(&fixtures_dir());
        assert_eq!(entities.len(), 3, "should load 3 entities from fixtures");

        assert!(entities.contains_key("test:race:human"));
        assert!(entities.contains_key("test:class:fighter"));
        assert!(entities.contains_key("test:feat:power-attack"));

        let fighter = &entities["test:class:fighter"];
        assert_eq!(fighter.source_pack, "test-pack");
        assert_eq!(fighter.entity_type, "class");
    }
}
