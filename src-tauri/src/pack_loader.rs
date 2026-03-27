use std::collections::HashMap;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

use crate::entity::Entity;

/// Manifest data from a content pack's manifest.yaml.
#[derive(Debug, serde::Deserialize)]
pub struct Manifest {
    pub id: String,
    pub name: String,
    pub version: String,
    #[serde(default)]
    pub pack_type: String,
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
pub fn parse_mdx(content: &str, pack_id: &str) -> Option<Entity> {
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

    for entry in WalkDir::new(&entities_dir)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "mdx") {
            if let Ok(content) = fs::read_to_string(path) {
                if let Some(entity) = parse_mdx(&content, &manifest.id) {
                    entities.insert(entity.id.clone(), entity);
                }
            }
        }
    }

    entities
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
        let entity = parse_mdx(content, "test-pack").expect("should parse");
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
        assert!(parse_mdx(content, "test").is_none());
    }

    #[test]
    fn test_parse_mdx_incomplete_frontmatter() {
        let content = "---\nid: broken\n";
        assert!(parse_mdx(content, "test").is_none());
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
