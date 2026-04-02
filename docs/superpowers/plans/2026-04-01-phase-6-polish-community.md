# Phase 6: Polish + Community — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the engine is truly system-agnostic by encoding two additional game systems, enable community content sharing, and integrate AI storytelling for Rule of Cool.

**Architecture:** 5e and PF2e content packs validate that the engine's primitives (mechanic entities, subscriptions, computed views, workflows) can express fundamentally different game systems without engine changes. Community import/export uses the existing pack lifecycle (campaign → publish → import). Dependency resolution handles stacked packs (supplement on supplement). AI storytelling is a plugin that consumes Rule of Cool `note` fields.

**Tech Stack:** Content pack YAML/MDX, Zen-expression, WASM plugin contract, local AI inference (open-webui)

**Prerequisites:** Phases 0-5 complete. The engine must support: content packs with schemas (Phase 1), Zen-expression + subscriptions (Phase 2), data-driven workflows (Phase 3), slot-based UI rendering (Phase 4), campaign packs with DM authority (Phase 5).

---

### Task 1: Encode D&D 5e Mechanic Entities

**Files:**
- Create: `content/packs/dnd-5e/manifest.yaml`
- Create: `content/packs/dnd-5e/schemas/` (copy from srd-3.5e, modify)
- Create: `content/packs/dnd-5e/entities/mechanics/ability-scores.mdx`
- Create: `content/packs/dnd-5e/entities/mechanics/skills.mdx`
- Create: `content/packs/dnd-5e/entities/mechanics/saving-throws.mdx`
- Create: `content/packs/dnd-5e/entities/mechanics/proficiency.mdx`

- [ ] **Step 1: Create 5e pack manifest**

```yaml
# content/packs/dnd-5e/manifest.yaml
id: "dnd-5e"
name: "D&D 5th Edition SRD"
version: "0.1.0"
pack_type: source
system: "dnd-5e"
defines_system: true
dependencies: []
```

- [ ] **Step 2: Write 5e ability scores mechanic**

5e uses the same six abilities but different generation methods. Point buy costs differ from 3.5e.

```yaml
# content/packs/dnd-5e/entities/mechanics/ability-scores.mdx
---
id: "5e:mechanic:ability-scores"
entity_type: "mechanic"
properties:
  name: "Ability Scores"
  modifier_formula: "(score - 10) / 2"
  generation_methods:
    - id: "4d6-drop-lowest"
      name: "Standard Rolling"
      dice: "4d6kh3"
    - id: "point-buy"
      name: "Point Buy"
      budget: 27
      cost_table:
        8: 0
        9: 1
        10: 2
        11: 3
        12: 4
        13: 5
        14: 7
        15: 9
    - id: "standard-array"
      name: "Standard Array"
      values: [15, 14, 13, 12, 10, 8]
  abilities:
    - id: "str"; name: "Strength"; abbreviation: "STR"
    - id: "dex"; name: "Dexterity"; abbreviation: "DEX"
    - id: "con"; name: "Constitution"; abbreviation: "CON"
    - id: "int"; name: "Intelligence"; abbreviation: "INT"
    - id: "wis"; name: "Wisdom"; abbreviation: "WIS"
    - id: "cha"; name: "Charisma"; abbreviation: "CHA"
---
```

- [ ] **Step 3: Write 5e skills mechanic**

5e skills are proficiency-based, not rank-based. This is the key structural difference from 3.5e.

```yaml
# content/packs/dnd-5e/entities/mechanics/skills.mdx
---
id: "5e:mechanic:skills"
entity_type: "mechanic"
properties:
  name: "Skill System"
  proficiency_model: "binary"
  proficiency_bonus_formula: "floor((level - 1) / 4) + 2"
  expertise_multiplier: 2
  skills:
    - id: "acrobatics"; name: "Acrobatics"; ability: "dex"
    - id: "animal_handling"; name: "Animal Handling"; ability: "wis"
    - id: "arcana"; name: "Arcana"; ability: "int"
    - id: "athletics"; name: "Athletics"; ability: "str"
    - id: "deception"; name: "Deception"; ability: "cha"
    - id: "history"; name: "History"; ability: "int"
    - id: "insight"; name: "Insight"; ability: "wis"
    - id: "intimidation"; name: "Intimidation"; ability: "cha"
    - id: "investigation"; name: "Investigation"; ability: "int"
    - id: "medicine"; name: "Medicine"; ability: "wis"
    - id: "nature"; name: "Nature"; ability: "int"
    - id: "perception"; name: "Perception"; ability: "wis"
    - id: "performance"; name: "Performance"; ability: "cha"
    - id: "persuasion"; name: "Persuasion"; ability: "cha"
    - id: "religion"; name: "Religion"; ability: "int"
    - id: "sleight_of_hand"; name: "Sleight of Hand"; ability: "dex"
    - id: "stealth"; name: "Stealth"; ability: "dex"
    - id: "survival"; name: "Survival"; ability: "wis"
---
```

- [ ] **Step 4: Write 5e saving throws mechanic**

5e saves are ability-based (all six), not the 3.5e Fort/Ref/Will model. This is a major structural test of the engine's generality.

```yaml
# content/packs/dnd-5e/entities/mechanics/saving-throws.mdx
---
id: "5e:mechanic:saving-throws"
entity_type: "mechanic"
properties:
  name: "Saving Throws"
  model: "ability-based"
  saves:
    - id: "str"; name: "Strength Save"; ability: "str"
    - id: "dex"; name: "Dexterity Save"; ability: "dex"
    - id: "con"; name: "Constitution Save"; ability: "con"
    - id: "int"; name: "Intelligence Save"; ability: "int"
    - id: "wis"; name: "Wisdom Save"; ability: "wis"
    - id: "cha"; name: "Charisma Save"; ability: "cha"
  formula: "if proficient then ability_modifier + proficiency_bonus else ability_modifier"
---
```

- [ ] **Step 5: Write 5e proficiency mechanic**

```yaml
# content/packs/dnd-5e/entities/mechanics/proficiency.mdx
---
id: "5e:mechanic:proficiency"
entity_type: "mechanic"
properties:
  name: "Proficiency Bonus"
  formula: "floor((level - 1) / 4) + 2"
  applies_to:
    - "skills (if proficient)"
    - "saving throws (if proficient)"
    - "attack rolls (with proficient weapons)"
    - "spell attack rolls"
    - "ability checks (with proficient tools)"
---
```

- [ ] **Step 6: Run pack test to validate 5e entities**

Run:
```bash
cargo run -- pack test content/packs/dnd-5e/
```

Expected: All entities pass schema validation. Computed views evaluate correctly with test fixtures.

- [ ] **Step 7: Write test fixtures for 5e mechanics**

```yaml
# content/packs/dnd-5e/entities/mechanics/ability-scores.test.yaml
fixtures:
  - name: "5e STR modifier for score 16"
    entity_state:
      abilities.strength.score: 16
    expect:
      abilities.strength.modifier: 3

  - name: "5e proficiency bonus at level 1"
    entity_state:
      level: 1
    expect:
      proficiency_bonus: 2

  - name: "5e proficiency bonus at level 5"
    entity_state:
      level: 5
    expect:
      proficiency_bonus: 3

  - name: "5e proficiency bonus at level 17"
    entity_state:
      level: 17
    expect:
      proficiency_bonus: 6
```

- [ ] **Step 8: Commit**

Run:
```bash
git add content/packs/dnd-5e/
git commit -m "feat: add D&D 5e content pack with core mechanic entities"
```

---

### Task 2: Encode Pathfinder 2e Mechanic Entities

**Files:**
- Create: `content/packs/pf2e/manifest.yaml`
- Create: `content/packs/pf2e/entities/mechanics/ability-scores.mdx`
- Create: `content/packs/pf2e/entities/mechanics/skills.mdx`
- Create: `content/packs/pf2e/entities/mechanics/saving-throws.mdx`
- Create: `content/packs/pf2e/entities/mechanics/proficiency.mdx`

- [ ] **Step 1: Create PF2e pack manifest**

```yaml
# content/packs/pf2e/manifest.yaml
id: "pf2e"
name: "Pathfinder 2nd Edition"
version: "0.1.0"
pack_type: source
system: "pf2e"
defines_system: true
dependencies: []
```

- [ ] **Step 2: Write PF2e ability scores mechanic**

PF2e uses ability boosts/flaws instead of point buy or rolling. Radically different generation model — strong test of engine flexibility.

```yaml
# content/packs/pf2e/entities/mechanics/ability-scores.mdx
---
id: "pf2e:mechanic:ability-scores"
entity_type: "mechanic"
properties:
  name: "Ability Scores"
  modifier_formula: "(score - 10) / 2"
  generation_methods:
    - id: "ability-boosts"
      name: "Ability Boosts"
      base_score: 10
      boost_value: 2
      boost_value_above_18: 1
      ancestry_boosts: 2
      ancestry_flaw: 1
      background_boosts: 2
      class_boost: 1
      free_boosts: 4
  abilities:
    - id: "str"; name: "Strength"; abbreviation: "STR"
    - id: "dex"; name: "Dexterity"; abbreviation: "DEX"
    - id: "con"; name: "Constitution"; abbreviation: "CON"
    - id: "int"; name: "Intelligence"; abbreviation: "INT"
    - id: "wis"; name: "Wisdom"; abbreviation: "WIS"
    - id: "cha"; name: "Charisma"; abbreviation: "CHA"
---
```

- [ ] **Step 3: Write PF2e proficiency mechanic**

PF2e's four-tier proficiency system (Trained/Expert/Master/Legendary) with level-based scaling is structurally different from both 3.5e and 5e.

```yaml
# content/packs/pf2e/entities/mechanics/proficiency.mdx
---
id: "pf2e:mechanic:proficiency"
entity_type: "mechanic"
properties:
  name: "Proficiency"
  tiers:
    - id: "untrained"; name: "Untrained"; bonus: 0; adds_level: false
    - id: "trained"; name: "Trained"; bonus: 2; adds_level: true
    - id: "expert"; name: "Expert"; bonus: 4; adds_level: true
    - id: "master"; name: "Master"; bonus: 6; adds_level: true
    - id: "legendary"; name: "Legendary"; bonus: 8; adds_level: true
  formula: "if adds_level then tier_bonus + level else tier_bonus"
---
```

- [ ] **Step 4: Write PF2e skills mechanic**

```yaml
# content/packs/pf2e/entities/mechanics/skills.mdx
---
id: "pf2e:mechanic:skills"
entity_type: "mechanic"
properties:
  name: "Skill System"
  proficiency_model: "tiered"
  proficiency_ref: "pf2e:mechanic:proficiency"
  formula: "ability_modifier + proficiency + item_bonus + circumstance_bonus"
  skills:
    - id: "acrobatics"; name: "Acrobatics"; ability: "dex"
    - id: "arcana"; name: "Arcana"; ability: "int"; trained_only: true
    - id: "athletics"; name: "Athletics"; ability: "str"
    - id: "crafting"; name: "Crafting"; ability: "int"; trained_only: true
    - id: "deception"; name: "Deception"; ability: "cha"
    - id: "diplomacy"; name: "Diplomacy"; ability: "cha"
    - id: "intimidation"; name: "Intimidation"; ability: "cha"
    - id: "medicine"; name: "Medicine"; ability: "wis"; trained_only: true
    - id: "nature"; name: "Nature"; ability: "wis"; trained_only: true
    - id: "occultism"; name: "Occultism"; ability: "int"; trained_only: true
    - id: "performance"; name: "Performance"; ability: "cha"
    - id: "religion"; name: "Religion"; ability: "wis"; trained_only: true
    - id: "society"; name: "Society"; ability: "int"; trained_only: true
    - id: "stealth"; name: "Stealth"; ability: "dex"
    - id: "survival"; name: "Survival"; ability: "wis"
    - id: "thievery"; name: "Thievery"; ability: "dex"; trained_only: true
  lore_skills:
    description: "Lore skills are custom Intelligence-based skills chosen at character creation"
    ability: "int"
    trained_only: true
---
```

- [ ] **Step 5: Write PF2e saving throws mechanic**

```yaml
# content/packs/pf2e/entities/mechanics/saving-throws.mdx
---
id: "pf2e:mechanic:saving-throws"
entity_type: "mechanic"
properties:
  name: "Saving Throws"
  model: "proficiency-tiered"
  proficiency_ref: "pf2e:mechanic:proficiency"
  saves:
    - id: "fort"; name: "Fortitude"; ability: "con"
    - id: "ref"; name: "Reflex"; ability: "dex"
    - id: "will"; name: "Will"; ability: "wis"
  formula: "ability_modifier + proficiency + item_bonus"
---
```

- [ ] **Step 6: Write test fixtures and run pack test**

```yaml
# content/packs/pf2e/entities/mechanics/proficiency.test.yaml
fixtures:
  - name: "Untrained at level 5"
    entity_state:
      tier: "untrained"
      level: 5
    expect:
      proficiency_bonus: 0

  - name: "Trained at level 5"
    entity_state:
      tier: "trained"
      level: 5
    expect:
      proficiency_bonus: 7

  - name: "Legendary at level 20"
    entity_state:
      tier: "legendary"
      level: 20
    expect:
      proficiency_bonus: 28
```

Run:
```bash
cargo run -- pack test content/packs/pf2e/
```

Expected: All entities pass schema validation and fixture tests.

- [ ] **Step 7: Commit**

Run:
```bash
git add content/packs/pf2e/
git commit -m "feat: add Pathfinder 2e content pack with core mechanic entities"
```

---

### Task 3: Community Campaign Pack Import/Export

**Files:**
- Modify: `src-tauri/src/engine/mod.rs` (add export/import methods)
- Create: `src-tauri/src/pack_export.rs`
- Create: `src-tauri/src/pack_import.rs`
- Modify: `src-tauri/src/ipc.rs` (add IPC commands)
- Test: `src-tauri/src/pack_export_tests.rs`

- [ ] **Step 1: Write failing test for campaign export**

```rust
// src-tauri/src/pack_export.rs
#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use tempfile::TempDir;

    #[test]
    fn test_export_strips_event_log() {
        let tmp = TempDir::new().unwrap();
        let campaign_path = tmp.path().join("test-campaign");
        std::fs::create_dir_all(campaign_path.join("event_log")).unwrap();
        std::fs::write(
            campaign_path.join("event_log/events.jsonl"),
            r#"{"id":"evt-1","op":"set","path":"hp","value":10}"#,
        ).unwrap();
        std::fs::write(
            campaign_path.join("manifest.yaml"),
            "id: test-campaign\npack_type: campaign\nversion: 0.1.0\n",
        ).unwrap();

        let export_path = tmp.path().join("exported");
        export_campaign(&campaign_path, &export_path).unwrap();

        // Event log should not exist in export
        assert!(!export_path.join("event_log").exists());
        // Manifest should be converted to source pack type
        let manifest = std::fs::read_to_string(export_path.join("manifest.yaml")).unwrap();
        assert!(manifest.contains("pack_type: source"));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd src-tauri && cargo test test_export_strips_event_log -- --nocapture
```

Expected: FAIL — `export_campaign` function doesn't exist.

- [ ] **Step 3: Implement campaign export**

```rust
// src-tauri/src/pack_export.rs
use std::path::Path;
use std::fs;
use walkdir::WalkDir;

/// Export a campaign pack as a publishable source pack.
/// Strips the event log and converts pack_type from "campaign" to "source".
pub fn export_campaign(campaign_path: &Path, export_path: &Path) -> Result<(), String> {
    fs::create_dir_all(export_path).map_err(|e| format!("Failed to create export dir: {e}"))?;

    for entry in WalkDir::new(campaign_path).into_iter().filter_map(|e| e.ok()) {
        let relative = entry.path().strip_prefix(campaign_path).unwrap();

        // Skip event_log and state directories
        if relative.starts_with("event_log") || relative.starts_with("state") {
            continue;
        }

        let dest = export_path.join(relative);
        if entry.file_type().is_dir() {
            fs::create_dir_all(&dest).map_err(|e| format!("Failed to create dir: {e}"))?;
        } else {
            fs::copy(entry.path(), &dest).map_err(|e| format!("Failed to copy file: {e}"))?;
        }
    }

    // Rewrite manifest: campaign -> source
    let manifest_path = export_path.join("manifest.yaml");
    if manifest_path.exists() {
        let content = fs::read_to_string(&manifest_path)
            .map_err(|e| format!("Failed to read manifest: {e}"))?;
        let updated = content.replace("pack_type: campaign", "pack_type: source");
        fs::write(&manifest_path, updated)
            .map_err(|e| format!("Failed to write manifest: {e}"))?;
    }

    Ok(())
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd src-tauri && cargo test test_export_strips_event_log -- --nocapture
```

Expected: PASS.

- [ ] **Step 5: Write failing test for campaign import**

```rust
// src-tauri/src/pack_import.rs
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_import_validates_manifest() {
        let tmp = TempDir::new().unwrap();
        let pack_path = tmp.path().join("imported-pack");
        std::fs::create_dir_all(&pack_path).unwrap();
        std::fs::write(
            pack_path.join("manifest.yaml"),
            "id: imported\npack_type: source\nversion: 1.0.0\nsystem: dnd-3.5e\n",
        ).unwrap();

        let result = validate_import(&pack_path);
        assert!(result.is_ok());
    }

    #[test]
    fn test_import_rejects_missing_manifest() {
        let tmp = TempDir::new().unwrap();
        let pack_path = tmp.path().join("no-manifest");
        std::fs::create_dir_all(&pack_path).unwrap();

        let result = validate_import(&pack_path);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("manifest.yaml"));
    }
}
```

- [ ] **Step 6: Implement import validation**

```rust
// src-tauri/src/pack_import.rs
use std::path::Path;
use std::fs;

/// Validate an imported pack has required structure.
pub fn validate_import(pack_path: &Path) -> Result<(), String> {
    let manifest_path = pack_path.join("manifest.yaml");
    if !manifest_path.exists() {
        return Err(format!(
            "Pack at {} is missing manifest.yaml",
            pack_path.display()
        ));
    }

    let content = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest.yaml: {e}"))?;

    if !content.contains("id:") {
        return Err("manifest.yaml missing required 'id' field".to_string());
    }
    if !content.contains("pack_type:") {
        return Err("manifest.yaml missing required 'pack_type' field".to_string());
    }
    if !content.contains("version:") {
        return Err("manifest.yaml missing required 'version' field".to_string());
    }

    Ok(())
}

/// Import a pack into the content directory.
pub fn import_pack(pack_path: &Path, content_dir: &Path) -> Result<String, String> {
    validate_import(pack_path)?;

    let manifest = fs::read_to_string(pack_path.join("manifest.yaml"))
        .map_err(|e| format!("Failed to read manifest: {e}"))?;

    // Extract pack id from manifest
    let id = manifest
        .lines()
        .find(|l| l.starts_with("id:"))
        .map(|l| l.trim_start_matches("id:").trim().trim_matches('"'))
        .ok_or("Could not extract pack id from manifest")?
        .to_string();

    let dest = content_dir.join(&id);
    if dest.exists() {
        return Err(format!("Pack '{}' already exists at {}", id, dest.display()));
    }

    // Copy pack to content directory
    copy_dir_recursive(pack_path, &dest)?;

    Ok(id)
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("Failed to create dir: {e}"))?;
    for entry in fs::read_dir(src).map_err(|e| format!("Failed to read dir: {e}"))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
        let dest_path = dst.join(entry.file_name());
        if entry.file_type().map_err(|e| format!("{e}"))?.is_dir() {
            copy_dir_recursive(&entry.path(), &dest_path)?;
        } else {
            fs::copy(entry.path(), &dest_path)
                .map_err(|e| format!("Failed to copy file: {e}"))?;
        }
    }
    Ok(())
}
```

- [ ] **Step 7: Run tests**

Run:
```bash
cd src-tauri && cargo test pack_import -- --nocapture
```

Expected: Both tests pass.

- [ ] **Step 8: Add IPC commands for export/import**

Add to `src-tauri/src/ipc.rs`:

```rust
#[tauri::command]
pub fn export_campaign_pack(campaign_path: String, export_path: String) -> Result<(), String> {
    crate::pack_export::export_campaign(
        &std::path::Path::new(&campaign_path),
        &std::path::Path::new(&export_path),
    )
}

#[tauri::command]
pub fn import_content_pack(pack_path: String, content_dir: String) -> Result<String, String> {
    crate::pack_import::import_pack(
        &std::path::Path::new(&pack_path),
        &std::path::Path::new(&content_dir),
    )
}
```

Register in `main.rs` invoke handler.

- [ ] **Step 9: Commit**

Run:
```bash
git add src-tauri/src/pack_export.rs src-tauri/src/pack_import.rs src-tauri/src/ipc.rs src-tauri/src/main.rs
git commit -m "feat: add campaign pack export/import with manifest validation"
```

---

### Task 4: Dependency Resolution for Stacked Content Packs

**Files:**
- Create: `src-tauri/src/dependency.rs`
- Modify: `src-tauri/src/pack_loader.rs`
- Test: inline in `dependency.rs`

- [ ] **Step 1: Write failing test for dependency resolution**

```rust
// src-tauri/src/dependency.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_order_simple_chain() {
        let packs = vec![
            PackDep { id: "complete-warrior".into(), dependencies: vec!["srd-3.5e".into()] },
            PackDep { id: "srd-3.5e".into(), dependencies: vec![] },
        ];
        let order = resolve_load_order(&packs).unwrap();
        assert_eq!(order, vec!["srd-3.5e", "complete-warrior"]);
    }

    #[test]
    fn test_resolve_order_detects_cycle() {
        let packs = vec![
            PackDep { id: "a".into(), dependencies: vec!["b".into()] },
            PackDep { id: "b".into(), dependencies: vec!["a".into()] },
        ];
        let result = resolve_load_order(&packs);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cycle"));
    }

    #[test]
    fn test_resolve_order_diamond() {
        let packs = vec![
            PackDep { id: "campaign".into(), dependencies: vec!["supplement-a".into(), "supplement-b".into()] },
            PackDep { id: "supplement-a".into(), dependencies: vec!["srd".into()] },
            PackDep { id: "supplement-b".into(), dependencies: vec!["srd".into()] },
            PackDep { id: "srd".into(), dependencies: vec![] },
        ];
        let order = resolve_load_order(&packs).unwrap();
        // srd must come first, campaign must come last
        assert_eq!(order[0], "srd");
        assert_eq!(order[order.len() - 1], "campaign");
    }

    #[test]
    fn test_resolve_order_missing_dependency() {
        let packs = vec![
            PackDep { id: "a".into(), dependencies: vec!["nonexistent".into()] },
        ];
        let result = resolve_load_order(&packs);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("nonexistent"));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd src-tauri && cargo test dependency -- --nocapture
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement dependency resolution (topological sort)**

```rust
// src-tauri/src/dependency.rs
use std::collections::{HashMap, HashSet, VecDeque};

#[derive(Debug, Clone)]
pub struct PackDep {
    pub id: String,
    pub dependencies: Vec<String>,
}

/// Resolve pack load order via topological sort (Kahn's algorithm).
/// Returns pack IDs in dependency order (roots first).
pub fn resolve_load_order(packs: &[PackDep]) -> Result<Vec<String>, String> {
    let pack_ids: HashSet<&str> = packs.iter().map(|p| p.id.as_str()).collect();

    // Check for missing dependencies
    for pack in packs {
        for dep in &pack.dependencies {
            if !pack_ids.contains(dep.as_str()) {
                return Err(format!(
                    "Pack '{}' depends on '{}' which is not loaded",
                    pack.id, dep
                ));
            }
        }
    }

    // Build adjacency list and in-degree map
    let mut in_degree: HashMap<&str, usize> = HashMap::new();
    let mut dependents: HashMap<&str, Vec<&str>> = HashMap::new();

    for pack in packs {
        in_degree.entry(pack.id.as_str()).or_insert(0);
        for dep in &pack.dependencies {
            *in_degree.entry(pack.id.as_str()).or_insert(0) += 1;
            dependents.entry(dep.as_str()).or_default().push(pack.id.as_str());
        }
    }

    // Kahn's algorithm
    let mut queue: VecDeque<&str> = in_degree
        .iter()
        .filter(|(_, &deg)| deg == 0)
        .map(|(&id, _)| id)
        .collect();
    let mut order = Vec::new();

    while let Some(id) = queue.pop_front() {
        order.push(id.to_string());
        if let Some(deps) = dependents.get(id) {
            for &dep in deps {
                let deg = in_degree.get_mut(dep).unwrap();
                *deg -= 1;
                if *deg == 0 {
                    queue.push_back(dep);
                }
            }
        }
    }

    if order.len() != packs.len() {
        return Err("Dependency cycle detected among content packs".to_string());
    }

    Ok(order)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd src-tauri && cargo test dependency -- --nocapture
```

Expected: All 4 tests pass.

- [ ] **Step 5: Integrate into pack loader**

Modify `src-tauri/src/pack_loader.rs` to call `resolve_load_order` before loading entities. Extract `PackDep` from each manifest's `dependencies` field, resolve order, then load packs in that order.

- [ ] **Step 6: Commit**

Run:
```bash
git add src-tauri/src/dependency.rs src-tauri/src/pack_loader.rs src-tauri/src/main.rs
git commit -m "feat: add topological dependency resolution for stacked content packs"
```

---

### Task 5: AI Storytelling Plugin for Rule of Cool

**Files:**
- Create: `content/packs/srd-3.5e/plugins/storytelling/manifest.yaml`
- Create: `content/packs/srd-3.5e/plugins/storytelling/storytelling.rs` (plugin contract stub)
- Create: `src-tauri/src/plugin_host.rs` (if not already created in Phase 2)

- [ ] **Step 1: Define the storytelling plugin contract**

The AI storytelling layer is a plugin — it consumes Rule of Cool `note` fields and produces narrative text. It does NOT modify game state.

```yaml
# content/packs/srd-3.5e/plugins/storytelling/manifest.yaml
id: "srd:plugin:storytelling"
name: "AI Storytelling Layer"
version: "0.1.0"
description: "Consumes Rule of Cool notes and generates narrative flavor text"
contract:
  input:
    - event_log: "recent events with note fields"
    - character_state: "current character snapshot"
    - campaign_context: "campaign metadata and tone"
  output:
    - narrative: "string — generated narrative text"
    - operations: []  # storytelling plugin produces NO state changes
  config:
    ai_backend: "local"  # "local" (open-webui), "api" (Claude), "none" (disabled)
    model: "configurable"
    tone: "configurable"  # "serious", "humorous", "dramatic", "noir"
    max_tokens: 200
```

- [ ] **Step 2: Write the plugin integration point**

This is a stub — the actual AI inference integration depends on the open-webui setup. The plugin contract is what matters.

```rust
// src-tauri/src/storytelling.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct StorytellingRequest {
    pub recent_notes: Vec<String>,
    pub character_name: String,
    pub campaign_tone: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StorytellingResponse {
    pub narrative: String,
}

/// Generate narrative text from Rule of Cool notes.
/// This is the integration point — actual inference is delegated to the configured backend.
pub async fn generate_narrative(
    request: StorytellingRequest,
    _config: &StorytellingConfig,
) -> Result<StorytellingResponse, String> {
    // Stub: returns a formatted summary of the notes
    // Real implementation will call open-webui API or Claude API
    let narrative = format!(
        "The tale of {} continues: {}",
        request.character_name,
        request.recent_notes.join(" Meanwhile, ")
    );
    Ok(StorytellingResponse { narrative })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StorytellingConfig {
    pub ai_backend: String,
    pub model: String,
    pub tone: String,
    pub max_tokens: usize,
}

impl Default for StorytellingConfig {
    fn default() -> Self {
        Self {
            ai_backend: "none".to_string(),
            model: "default".to_string(),
            tone: "dramatic".to_string(),
            max_tokens: 200,
        }
    }
}
```

- [ ] **Step 3: Add IPC command for narrative generation**

Add to `src-tauri/src/ipc.rs`:

```rust
#[tauri::command]
pub async fn generate_rule_of_cool_narrative(
    recent_notes: Vec<String>,
    character_name: String,
    campaign_tone: String,
) -> Result<String, String> {
    let request = crate::storytelling::StorytellingRequest {
        recent_notes,
        character_name,
        campaign_tone,
    };
    let config = crate::storytelling::StorytellingConfig::default();
    let response = crate::storytelling::generate_narrative(request, &config).await?;
    Ok(response.narrative)
}
```

- [ ] **Step 4: Commit**

Run:
```bash
git add content/packs/srd-3.5e/plugins/storytelling/ src-tauri/src/storytelling.rs src-tauri/src/ipc.rs src-tauri/src/main.rs
git commit -m "feat: add AI storytelling plugin stub with Rule of Cool narrative generation"
```

---

### Task 6: Phase 6 verification

- [ ] **Step 1: Verify all three content packs load**

Run:
```bash
cargo run -- pack test content/packs/srd-3.5e/
cargo run -- pack test content/packs/dnd-5e/
cargo run -- pack test content/packs/pf2e/
```

Expected: All packs pass validation.

- [ ] **Step 2: Verify dependency resolution with stacked packs**

Create a test campaign that depends on srd-3.5e + complete-warrior (or similar) and verify load order resolution.

- [ ] **Step 3: Verify export/import round-trip**

Create a test campaign, export it, import it as a source pack, verify the imported pack loads correctly.

- [ ] **Step 4: Run full test suite**

Run:
```bash
pnpm run test
cd src-tauri && cargo test
pnpm run test:e2e
```

Expected: All tests pass.

- [ ] **Step 5: Tag Phase 6 complete**

Run:
```bash
git tag phase-6-complete
```
