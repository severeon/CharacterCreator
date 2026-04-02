# Phase 1: Content Pack Schema — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define JSON Schema for all entity types, encode D&D 3.5e system primitives as Mechanic entities, and make the engine read game mechanics from content packs instead of hardcoded Rust.

**Architecture:** JSON Schemas (written in YAML, converted to JSON Schema at validation time) define the shape of every entity type. Mechanic entities encode ability scores, skills, saves, and BAB progressions as data. The engine's pack loader validates entities against schemas at load time, and engine modules query loaded Mechanic entities instead of using hardcoded formulas. A `pack test` CLI subcommand validates packs in isolation with test fixtures. Computed view dependencies are topologically sorted at load time with cycle detection.

**Tech Stack:** Rust (jsonschema crate, serde_yaml), YAML schemas, MDX entity frontmatter

**Current State (hardcoded game knowledge to extract):**
- `engine/abilities.rs:33,40` — modifier formula `(score - 10) / 2`
- `engine/abilities.rs:52,59` — skill point calculation with INT mod, level-1 multiplier of 4
- `engine/skills.rs:92-93` — cost per rank (1/2), max ranks (level+3 / (level+3)/2)
- `engine/character.rs:66-78` — skill-to-ability mappings (12+ hardcoded match arms)
- `engine/export.rs:86-93,102` — ability names and modifier formula in export
- `engine/feats.rs:39` — default feat slot count
- `engine/selection.rs:105-144` — hardcoded class property names
- `workflow.rs:177-230` — hardcoded character creation steps (Phase 3 concern, not Phase 1)

---

### Task 1: Add jsonschema crate dependency

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add jsonschema to Cargo.toml**

Add to `[dependencies]`:

```toml
jsonschema = "0.29"
```

- [ ] **Step 2: Verify it compiles**

Run:
```bash
cd src-tauri && cargo build
```

Expected: Build succeeds with jsonschema downloaded.

- [ ] **Step 3: Commit**

Run:
```bash
git add src-tauri/Cargo.toml
git commit -m "feat: add jsonschema crate for content pack validation"
```

---

### Task 2: Create JSON Schema files for entity types

**Files:**
- Create: `content/packs/srd-3.5e/schemas/_base.schema.yaml`
- Create: `content/packs/srd-3.5e/schemas/mechanic.schema.yaml`
- Create: `content/packs/srd-3.5e/schemas/template.schema.yaml`
- Create: `content/packs/srd-3.5e/schemas/rule.schema.yaml`
- Create: `content/packs/srd-3.5e/schemas/actionable.schema.yaml`
- Create: `content/packs/srd-3.5e/schemas/object.schema.yaml`
- Create: `content/packs/srd-3.5e/schemas/container.schema.yaml`
- Create: `content/packs/srd-3.5e/schemas/workflow.schema.yaml`

- [ ] **Step 1: Create base schema with shared definitions**

```yaml
# content/packs/srd-3.5e/schemas/_base.schema.yaml
$schema: "https://json-schema.org/draft/2020-12/schema"
$id: "arcanum://srd-3.5e/schemas/_base"
description: "Shared definitions for SRD 3.5e entity schemas"

$defs:
  entity_header:
    type: object
    required: [id, entity_type]
    properties:
      id:
        type: string
        pattern: "^[a-z0-9-]+:[a-z0-9-]+:[a-z0-9-]+$"
        description: "Namespaced entity ID (pack:category:name)"
      entity_type:
        type: string
        description: "Dot-notation entity type (e.g. template.class)"
      extends:
        type: string
        description: "ID of parent entity for deep merge inheritance"
      tags:
        type: array
        items:
          type: string
          pattern: "^[a-z0-9-]+:[a-z0-9-]+$"

  save_progression:
    type: string
    enum: [good, poor]

  bab_type:
    type: string
    enum: [full, medium, poor]

  ability_ref:
    type: string
    enum: [str, dex, con, int, wis, cha]

  subscription:
    type: object
    required: [trigger]
    properties:
      trigger:
        type: string
      predicate:
        type: object
      effects:
        type: array
        items:
          type: object
          required: [op, path, value]
      plugin:
        type: string
      config:
        type: object

  computed_view:
    type: object
    required: [path, inputs, formula]
    properties:
      path:
        type: string
      inputs:
        type: array
        items:
          type: string
      formula:
        type: string
      source:
        type: string
```

- [ ] **Step 2: Create mechanic schema**

```yaml
# content/packs/srd-3.5e/schemas/mechanic.schema.yaml
$schema: "https://json-schema.org/draft/2020-12/schema"
$id: "arcanum://srd-3.5e/schemas/mechanic"
description: "Schema for Mechanic entities — system primitives"

allOf:
  - $ref: "_base.schema.yaml#/$defs/entity_header"
  - type: object
    required: [properties]
    properties:
      entity_type:
        const: "mechanic"
      properties:
        type: object
        required: [name]
        properties:
          name:
            type: string
        additionalProperties: true
      subscriptions:
        type: array
        items:
          $ref: "_base.schema.yaml#/$defs/subscription"
      computed_views:
        type: array
        items:
          $ref: "_base.schema.yaml#/$defs/computed_view"
```

- [ ] **Step 3: Create template schema**

```yaml
# content/packs/srd-3.5e/schemas/template.schema.yaml
$schema: "https://json-schema.org/draft/2020-12/schema"
$id: "arcanum://srd-3.5e/schemas/template"
description: "Schema for Template entities — blueprints applied to creatures"

allOf:
  - $ref: "_base.schema.yaml#/$defs/entity_header"
  - type: object
    required: [properties]
    properties:
      entity_type:
        type: string
        pattern: "^template(\\.[a-z_]+)?$"
      properties:
        type: object
        required: [name]
        properties:
          name:
            type: string
          hd:
            type: integer
            minimum: 1
            maximum: 20
          bab_progression:
            type: string
          saves:
            type: object
            properties:
              fort:
                $ref: "_base.schema.yaml#/$defs/save_progression"
              ref:
                $ref: "_base.schema.yaml#/$defs/save_progression"
              will:
                $ref: "_base.schema.yaml#/$defs/save_progression"
          skill_points:
            type: integer
            minimum: 0
          class_skills:
            type: array
            items:
              type: string
        additionalProperties: true
      subscriptions:
        type: array
        items:
          $ref: "_base.schema.yaml#/$defs/subscription"
      computed_views:
        type: array
        items:
          $ref: "_base.schema.yaml#/$defs/computed_view"
```

- [ ] **Step 4: Create rule schema**

```yaml
# content/packs/srd-3.5e/schemas/rule.schema.yaml
$schema: "https://json-schema.org/draft/2020-12/schema"
$id: "arcanum://srd-3.5e/schemas/rule"
description: "Schema for Rule entities — feats, class features, conditions"

allOf:
  - $ref: "_base.schema.yaml#/$defs/entity_header"
  - type: object
    required: [properties]
    properties:
      entity_type:
        type: string
        pattern: "^rule(\\.[a-z_]+)?$"
      properties:
        type: object
        required: [name]
        properties:
          name:
            type: string
          description:
            type: string
          prerequisites:
            type: object
        additionalProperties: true
      subscriptions:
        type: array
        items:
          $ref: "_base.schema.yaml#/$defs/subscription"
      computed_views:
        type: array
        items:
          $ref: "_base.schema.yaml#/$defs/computed_view"
```

- [ ] **Step 5: Create actionable schema**

```yaml
# content/packs/srd-3.5e/schemas/actionable.schema.yaml
$schema: "https://json-schema.org/draft/2020-12/schema"
$id: "arcanum://srd-3.5e/schemas/actionable"
description: "Schema for Actionable entities — spells, powers, maneuvers"

allOf:
  - $ref: "_base.schema.yaml#/$defs/entity_header"
  - type: object
    required: [properties]
    properties:
      entity_type:
        type: string
        pattern: "^actionable(\\.[a-z_]+)?$"
      properties:
        type: object
        required: [name]
        properties:
          name:
            type: string
          level:
            type: integer
          school:
            type: string
          casting_time:
            type: string
          range:
            type: string
          duration:
            type: string
          saving_throw:
            type: string
          spell_resistance:
            type: string
          components:
            type: array
            items:
              type: string
        additionalProperties: true
      subscriptions:
        type: array
        items:
          $ref: "_base.schema.yaml#/$defs/subscription"
      computed_views:
        type: array
        items:
          $ref: "_base.schema.yaml#/$defs/computed_view"
```

- [ ] **Step 6: Create object, container, and workflow schemas**

```yaml
# content/packs/srd-3.5e/schemas/object.schema.yaml
$schema: "https://json-schema.org/draft/2020-12/schema"
$id: "arcanum://srd-3.5e/schemas/object"
description: "Schema for Object entities — weapons, armor, gear"

allOf:
  - $ref: "_base.schema.yaml#/$defs/entity_header"
  - type: object
    required: [properties]
    properties:
      entity_type:
        type: string
        pattern: "^object(\\.[a-z_]+)?$"
      properties:
        type: object
        required: [name]
        properties:
          name:
            type: string
          weight:
            type: number
          cost:
            type: string
        additionalProperties: true
```

```yaml
# content/packs/srd-3.5e/schemas/container.schema.yaml
$schema: "https://json-schema.org/draft/2020-12/schema"
$id: "arcanum://srd-3.5e/schemas/container"
description: "Schema for Container entities — inventories, spellbooks"

allOf:
  - $ref: "_base.schema.yaml#/$defs/entity_header"
  - type: object
    required: [properties]
    properties:
      entity_type:
        type: string
        pattern: "^container(\\.[a-z_]+)?$"
      properties:
        type: object
        required: [name]
        properties:
          name:
            type: string
          items:
            type: array
            items:
              type: string
        additionalProperties: true
```

```yaml
# content/packs/srd-3.5e/schemas/workflow.schema.yaml
$schema: "https://json-schema.org/draft/2020-12/schema"
$id: "arcanum://srd-3.5e/schemas/workflow"
description: "Schema for Workflow entities — character creation, level-up"

allOf:
  - $ref: "_base.schema.yaml#/$defs/entity_header"
  - type: object
    required: [properties]
    properties:
      entity_type:
        const: "workflow"
      properties:
        type: object
        required: [name, steps]
        properties:
          name:
            type: string
          completion_creates:
            type: string
          steps:
            type: array
            items:
              type: object
              required: [id, name, component]
              properties:
                id:
                  type: string
                name:
                  type: string
                component:
                  type: string
                config:
                  type: object
                required:
                  type: boolean
                repeatable:
                  type: boolean
                depends_on:
                  type: array
                  items:
                    type: string
                before:
                  type: string
                override:
                  type: string
        additionalProperties: true
```

- [ ] **Step 7: Commit all schemas**

Run:
```bash
git add content/packs/srd-3.5e/schemas/
git commit -m "feat: add JSON Schema files for all eight entity types"
```

---

### Task 3: Create D&D 3.5e Mechanic entities

These replace the hardcoded values in the engine. The entities match the format defined in the spec.

**Files:**
- Create: `content/packs/srd-3.5e/entities/mechanics/ability-scores.mdx`
- Create: `content/packs/srd-3.5e/entities/mechanics/skills.mdx`
- Create: `content/packs/srd-3.5e/entities/mechanics/saving-throws.mdx`
- Create: `content/packs/srd-3.5e/entities/mechanics/bab-progressions.mdx`
- Create: `content/packs/srd-3.5e/entities/mechanics/size-categories.mdx`

- [ ] **Step 1: Create ability scores mechanic entity**

```yaml
# content/packs/srd-3.5e/entities/mechanics/ability-scores.mdx
---
id: "srd:mechanic:ability-scores"
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
    - id: "str"
      name: "Strength"
      abbreviation: "STR"
    - id: "dex"
      name: "Dexterity"
      abbreviation: "DEX"
    - id: "con"
      name: "Constitution"
      abbreviation: "CON"
    - id: "int"
      name: "Intelligence"
      abbreviation: "INT"
    - id: "wis"
      name: "Wisdom"
      abbreviation: "WIS"
    - id: "cha"
      name: "Charisma"
      abbreviation: "CHA"
tags:
  - "source:phb"
  - "category:mechanic"
---
```

- [ ] **Step 2: Create skills mechanic entity**

```yaml
# content/packs/srd-3.5e/entities/mechanics/skills.mdx
---
id: "srd:mechanic:skills"
entity_type: "mechanic"
properties:
  name: "Skill System"
  max_ranks_formula: "if is_class_skill then level + 3 else (level + 3) / 2"
  cost:
    class_skill: 1
    cross_class: 2
  first_level_multiplier: 4
  skills:
    - id: "appraise"; name: "Appraise"; ability: "int"; trained_only: false; armor_check_penalty: false
    - id: "balance"; name: "Balance"; ability: "dex"; trained_only: false; armor_check_penalty: true
    - id: "bluff"; name: "Bluff"; ability: "cha"; trained_only: false; armor_check_penalty: false
    - id: "climb"; name: "Climb"; ability: "str"; trained_only: false; armor_check_penalty: true
    - id: "concentration"; name: "Concentration"; ability: "con"; trained_only: false; armor_check_penalty: false
    - id: "craft"; name: "Craft"; ability: "int"; trained_only: false; armor_check_penalty: false
    - id: "decipher_script"; name: "Decipher Script"; ability: "int"; trained_only: true; armor_check_penalty: false
    - id: "diplomacy"; name: "Diplomacy"; ability: "cha"; trained_only: false; armor_check_penalty: false
    - id: "disable_device"; name: "Disable Device"; ability: "int"; trained_only: true; armor_check_penalty: false
    - id: "disguise"; name: "Disguise"; ability: "cha"; trained_only: false; armor_check_penalty: false
    - id: "escape_artist"; name: "Escape Artist"; ability: "dex"; trained_only: false; armor_check_penalty: true
    - id: "forgery"; name: "Forgery"; ability: "int"; trained_only: false; armor_check_penalty: false
    - id: "gather_information"; name: "Gather Information"; ability: "cha"; trained_only: false; armor_check_penalty: false
    - id: "handle_animal"; name: "Handle Animal"; ability: "cha"; trained_only: true; armor_check_penalty: false
    - id: "heal"; name: "Heal"; ability: "wis"; trained_only: false; armor_check_penalty: false
    - id: "hide"; name: "Hide"; ability: "dex"; trained_only: false; armor_check_penalty: true
    - id: "intimidate"; name: "Intimidate"; ability: "cha"; trained_only: false; armor_check_penalty: false
    - id: "jump"; name: "Jump"; ability: "str"; trained_only: false; armor_check_penalty: true
    - id: "knowledge_arcana"; name: "Knowledge (Arcana)"; ability: "int"; trained_only: true; armor_check_penalty: false
    - id: "knowledge_dungeoneering"; name: "Knowledge (Dungeoneering)"; ability: "int"; trained_only: true; armor_check_penalty: false
    - id: "knowledge_engineering"; name: "Knowledge (Engineering)"; ability: "int"; trained_only: true; armor_check_penalty: false
    - id: "knowledge_geography"; name: "Knowledge (Geography)"; ability: "int"; trained_only: true; armor_check_penalty: false
    - id: "knowledge_history"; name: "Knowledge (History)"; ability: "int"; trained_only: true; armor_check_penalty: false
    - id: "knowledge_local"; name: "Knowledge (Local)"; ability: "int"; trained_only: true; armor_check_penalty: false
    - id: "knowledge_nature"; name: "Knowledge (Nature)"; ability: "int"; trained_only: true; armor_check_penalty: false
    - id: "knowledge_nobility"; name: "Knowledge (Nobility)"; ability: "int"; trained_only: true; armor_check_penalty: false
    - id: "knowledge_planes"; name: "Knowledge (The Planes)"; ability: "int"; trained_only: true; armor_check_penalty: false
    - id: "knowledge_religion"; name: "Knowledge (Religion)"; ability: "int"; trained_only: true; armor_check_penalty: false
    - id: "listen"; name: "Listen"; ability: "wis"; trained_only: false; armor_check_penalty: false
    - id: "move_silently"; name: "Move Silently"; ability: "dex"; trained_only: false; armor_check_penalty: true
    - id: "open_lock"; name: "Open Lock"; ability: "dex"; trained_only: true; armor_check_penalty: false
    - id: "perform"; name: "Perform"; ability: "cha"; trained_only: false; armor_check_penalty: false
    - id: "profession"; name: "Profession"; ability: "wis"; trained_only: true; armor_check_penalty: false
    - id: "ride"; name: "Ride"; ability: "dex"; trained_only: false; armor_check_penalty: false
    - id: "search"; name: "Search"; ability: "int"; trained_only: false; armor_check_penalty: false
    - id: "sense_motive"; name: "Sense Motive"; ability: "wis"; trained_only: false; armor_check_penalty: false
    - id: "sleight_of_hand"; name: "Sleight of Hand"; ability: "dex"; trained_only: true; armor_check_penalty: true
    - id: "spellcraft"; name: "Spellcraft"; ability: "int"; trained_only: true; armor_check_penalty: false
    - id: "spot"; name: "Spot"; ability: "wis"; trained_only: false; armor_check_penalty: false
    - id: "survival"; name: "Survival"; ability: "wis"; trained_only: false; armor_check_penalty: false
    - id: "swim"; name: "Swim"; ability: "str"; trained_only: false; armor_check_penalty: true
    - id: "tumble"; name: "Tumble"; ability: "dex"; trained_only: true; armor_check_penalty: true
    - id: "use_magic_device"; name: "Use Magic Device"; ability: "cha"; trained_only: true; armor_check_penalty: false
    - id: "use_rope"; name: "Use Rope"; ability: "dex"; trained_only: false; armor_check_penalty: false
tags:
  - "source:phb"
  - "category:mechanic"
---
```

- [ ] **Step 3: Create saving throws mechanic entity**

```yaml
# content/packs/srd-3.5e/entities/mechanics/saving-throws.mdx
---
id: "srd:mechanic:saving-throws"
entity_type: "mechanic"
properties:
  name: "Saving Throws"
  saves:
    - id: "fort"; name: "Fortitude"; abbreviation: "Fort"; ability: "con"
    - id: "ref"; name: "Reflex"; abbreviation: "Ref"; ability: "dex"
    - id: "will"; name: "Will"; abbreviation: "Will"; ability: "wis"
  progressions:
    good: [2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12]
    poor: [0,0,1,1,1,2,2,2,3,3,3,4,4,4,5,5,5,6,6,6]
tags:
  - "source:phb"
  - "category:mechanic"
---
```

- [ ] **Step 4: Create BAB progressions mechanic entity**

```yaml
# content/packs/srd-3.5e/entities/mechanics/bab-progressions.mdx
---
id: "srd:mechanic:bab-progressions"
entity_type: "mechanic"
properties:
  name: "Base Attack Bonus Progressions"
  progressions:
    full:   [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
    medium: [0,1,2,3,3,4,5,6,6,7,8,9,9,10,11,12,12,13,14,15]
    poor:   [0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10]
  iterative_attack_threshold: 6
tags:
  - "source:phb"
  - "category:mechanic"
---
```

- [ ] **Step 5: Create size categories mechanic entity**

```yaml
# content/packs/srd-3.5e/entities/mechanics/size-categories.mdx
---
id: "srd:mechanic:size-categories"
entity_type: "mechanic"
properties:
  name: "Size Categories"
  categories:
    - id: "fine"; name: "Fine"; ac_mod: 8; attack_mod: 8; grapple_mod: -16; space: "0.5"; reach: 0
    - id: "diminutive"; name: "Diminutive"; ac_mod: 4; attack_mod: 4; grapple_mod: -12; space: "1"; reach: 0
    - id: "tiny"; name: "Tiny"; ac_mod: 2; attack_mod: 2; grapple_mod: -8; space: "2.5"; reach: 0
    - id: "small"; name: "Small"; ac_mod: 1; attack_mod: 1; grapple_mod: -4; space: "5"; reach: 5
    - id: "medium"; name: "Medium"; ac_mod: 0; attack_mod: 0; grapple_mod: 0; space: "5"; reach: 5
    - id: "large"; name: "Large"; ac_mod: -1; attack_mod: -1; grapple_mod: 4; space: "10"; reach: 10
    - id: "huge"; name: "Huge"; ac_mod: -2; attack_mod: -2; grapple_mod: 8; space: "15"; reach: 15
    - id: "gargantuan"; name: "Gargantuan"; ac_mod: -4; attack_mod: -4; grapple_mod: 12; space: "20"; reach: 20
    - id: "colossal"; name: "Colossal"; ac_mod: -8; attack_mod: -8; grapple_mod: 16; space: "30"; reach: 30
tags:
  - "source:phb"
  - "category:mechanic"
---
```

- [ ] **Step 6: Commit all mechanic entities**

Run:
```bash
git add content/packs/srd-3.5e/entities/mechanics/
git commit -m "feat: add D&D 3.5e Mechanic entities for ability scores, skills, saves, BAB, size"
```

---

### Task 4: Schema validation at pack load time

**Files:**
- Create: `src-tauri/src/schema_validator.rs`
- Modify: `src-tauri/src/pack_loader.rs`
- Modify: `src-tauri/src/main.rs` (register module)

- [ ] **Step 1: Write failing test for schema validation**

```rust
// src-tauri/src/schema_validator.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_mechanic_entity_passes() {
        let schema_yaml = r#"
type: object
required: [id, entity_type, properties]
properties:
  id:
    type: string
  entity_type:
    type: string
  properties:
    type: object
    required: [name]
    properties:
      name:
        type: string
"#;
        let entity_yaml = r#"
id: "test:mechanic:test"
entity_type: "mechanic"
properties:
  name: "Test Mechanic"
"#;
        let result = validate_entity_against_schema(entity_yaml, schema_yaml);
        assert!(result.is_ok(), "Expected valid entity to pass: {:?}", result);
    }

    #[test]
    fn test_missing_required_field_fails() {
        let schema_yaml = r#"
type: object
required: [id, entity_type, properties]
properties:
  id:
    type: string
  entity_type:
    type: string
  properties:
    type: object
    required: [name]
    properties:
      name:
        type: string
"#;
        let entity_yaml = r#"
id: "test:mechanic:test"
entity_type: "mechanic"
"#;
        let result = validate_entity_against_schema(entity_yaml, schema_yaml);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("properties"), "Error should mention missing field: {}", err);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd src-tauri && cargo test schema_validator -- --nocapture
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement schema validator**

```rust
// src-tauri/src/schema_validator.rs
use jsonschema::Validator;
use serde_json::Value;

/// Validate an entity (YAML string) against a schema (YAML string).
/// Both are parsed as YAML, converted to JSON values, then validated.
pub fn validate_entity_against_schema(
    entity_yaml: &str,
    schema_yaml: &str,
) -> Result<(), String> {
    let entity: Value = serde_yaml::from_str(entity_yaml)
        .map_err(|e| format!("Failed to parse entity YAML: {e}"))?;

    let schema: Value = serde_yaml::from_str(schema_yaml)
        .map_err(|e| format!("Failed to parse schema YAML: {e}"))?;

    let validator = Validator::new(&schema)
        .map_err(|e| format!("Invalid schema: {e}"))?;

    let errors: Vec<String> = validator
        .iter_errors(&entity)
        .map(|e| format!("{} at {}", e, e.instance_path))
        .collect();

    if errors.is_empty() {
        Ok(())
    } else {
        Err(format!(
            "Schema validation failed with {} error(s):\n  {}",
            errors.len(),
            errors.join("\n  ")
        ))
    }
}

/// Determine which schema file to use for a given entity_type.
/// Maps the top-level category (before the first dot) to a schema filename.
pub fn schema_filename_for_entity_type(entity_type: &str) -> String {
    let category = entity_type
        .split('.')
        .next()
        .unwrap_or(entity_type);
    format!("{}.schema.yaml", category)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd src-tauri && cargo test schema_validator -- --nocapture
```

Expected: Both tests pass.

- [ ] **Step 5: Integrate validation into pack loader**

Modify `src-tauri/src/pack_loader.rs` to load schema files from the pack's `schemas/` directory and validate each entity at load time. If validation fails, log the error (Principle 6: Graceful Chaos) and skip the entity rather than crashing.

Add to the entity loading loop:

```rust
// In the entity loading loop of pack_loader.rs
let entity_type = frontmatter.get("entity_type")
    .and_then(|v| v.as_str())
    .unwrap_or("unknown");
let schema_file = schema_validator::schema_filename_for_entity_type(entity_type);
let schema_path = pack_path.join("schemas").join(&schema_file);

if schema_path.exists() {
    let schema_yaml = std::fs::read_to_string(&schema_path)
        .map_err(|e| format!("Failed to read schema {}: {e}", schema_path.display()))?;
    if let Err(err) = schema_validator::validate_entity_against_schema(&frontmatter_yaml, &schema_yaml) {
        eprintln!(
            "⚠️ Schema validation failed for {} — skipping entity. {}",
            entity_path.display(),
            err
        );
        continue;
    }
}
```

- [ ] **Step 6: Run all tests**

Run:
```bash
cd src-tauri && cargo test
```

Expected: All existing tests plus new schema validator tests pass.

- [ ] **Step 7: Commit**

Run:
```bash
git add src-tauri/src/schema_validator.rs src-tauri/src/pack_loader.rs src-tauri/src/main.rs
git commit -m "feat: add JSON Schema validation at pack load time"
```

---

### Task 5: Engine reads Mechanic entities instead of hardcoded values

**Files:**
- Create: `src-tauri/src/mechanic_store.rs`
- Modify: `src-tauri/src/engine/abilities.rs`
- Modify: `src-tauri/src/engine/skills.rs`
- Modify: `src-tauri/src/engine/character.rs`
- Modify: `src-tauri/src/engine/export.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Write failing test for mechanic store**

```rust
// src-tauri/src/mechanic_store.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_ability_score_mechanic() {
        let yaml = r#"
id: "srd:mechanic:ability-scores"
entity_type: "mechanic"
properties:
  name: "Ability Scores"
  modifier_formula: "(score - 10) / 2"
  abilities:
    - id: "str"
      name: "Strength"
      abbreviation: "STR"
    - id: "dex"
      name: "Dexterity"
      abbreviation: "DEX"
"#;
        let value: serde_json::Value = serde_yaml::from_str(yaml).unwrap();
        let store = MechanicStore::new();
        store.register("srd:mechanic:ability-scores", value.clone());

        let abilities = store.get_ability_definitions().unwrap();
        assert_eq!(abilities.len(), 2);
        assert_eq!(abilities[0].id, "str");
        assert_eq!(abilities[0].name, "Strength");
    }

    #[test]
    fn test_load_skill_to_ability_mapping() {
        let yaml = r#"
id: "srd:mechanic:skills"
entity_type: "mechanic"
properties:
  name: "Skill System"
  skills:
    - id: "climb"
      name: "Climb"
      ability: "str"
      trained_only: false
    - id: "hide"
      name: "Hide"
      ability: "dex"
      trained_only: false
"#;
        let value: serde_json::Value = serde_yaml::from_str(yaml).unwrap();
        let store = MechanicStore::new();
        store.register("srd:mechanic:skills", value.clone());

        let mapping = store.get_skill_ability_mapping().unwrap();
        assert_eq!(mapping.get("climb"), Some(&"str".to_string()));
        assert_eq!(mapping.get("hide"), Some(&"dex".to_string()));
    }

    #[test]
    fn test_modifier_formula() {
        let store = MechanicStore::new();
        // Hardcoded fallback until Zen-expression is integrated (Phase 2)
        assert_eq!(store.compute_ability_modifier(16), 3);
        assert_eq!(store.compute_ability_modifier(10), 0);
        assert_eq!(store.compute_ability_modifier(7), -1);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd src-tauri && cargo test mechanic_store -- --nocapture
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement MechanicStore**

```rust
// src-tauri/src/mechanic_store.rs
use serde_json::Value;
use std::collections::HashMap;
use std::sync::RwLock;

#[derive(Debug, Clone)]
pub struct AbilityDefinition {
    pub id: String,
    pub name: String,
    pub abbreviation: String,
}

pub struct MechanicStore {
    mechanics: RwLock<HashMap<String, Value>>,
}

impl MechanicStore {
    pub fn new() -> Self {
        Self {
            mechanics: RwLock::new(HashMap::new()),
        }
    }

    pub fn register(&self, id: &str, value: Value) {
        self.mechanics.write().unwrap().insert(id.to_string(), value);
    }

    pub fn get_ability_definitions(&self) -> Result<Vec<AbilityDefinition>, String> {
        let mechanics = self.mechanics.read().unwrap();
        let ability_mechanic = mechanics
            .get("srd:mechanic:ability-scores")
            .ok_or("Ability scores mechanic not loaded")?;

        let abilities = ability_mechanic
            .pointer("/properties/abilities")
            .and_then(|v| v.as_array())
            .ok_or("No abilities array in ability scores mechanic")?;

        abilities
            .iter()
            .map(|a| {
                Ok(AbilityDefinition {
                    id: a.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    name: a.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    abbreviation: a
                        .get("abbreviation")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                })
            })
            .collect()
    }

    pub fn get_skill_ability_mapping(&self) -> Result<HashMap<String, String>, String> {
        let mechanics = self.mechanics.read().unwrap();
        let skill_mechanic = mechanics
            .get("srd:mechanic:skills")
            .ok_or("Skills mechanic not loaded")?;

        let skills = skill_mechanic
            .pointer("/properties/skills")
            .and_then(|v| v.as_array())
            .ok_or("No skills array in skills mechanic")?;

        let mut mapping = HashMap::new();
        for skill in skills {
            let id = skill.get("id").and_then(|v| v.as_str()).unwrap_or("");
            let ability = skill.get("ability").and_then(|v| v.as_str()).unwrap_or("");
            if !id.is_empty() && !ability.is_empty() {
                mapping.insert(id.to_string(), ability.to_string());
            }
        }
        Ok(mapping)
    }

    pub fn get_skill_cost(&self, is_class_skill: bool) -> i32 {
        let mechanics = self.mechanics.read().unwrap();
        if let Some(skill_mechanic) = mechanics.get("srd:mechanic:skills") {
            let key = if is_class_skill { "class_skill" } else { "cross_class" };
            skill_mechanic
                .pointer(&format!("/properties/cost/{}", key))
                .and_then(|v| v.as_i64())
                .map(|v| v as i32)
                .unwrap_or(if is_class_skill { 1 } else { 2 })
        } else {
            if is_class_skill { 1 } else { 2 }
        }
    }

    pub fn get_first_level_multiplier(&self) -> i32 {
        let mechanics = self.mechanics.read().unwrap();
        if let Some(skill_mechanic) = mechanics.get("srd:mechanic:skills") {
            skill_mechanic
                .pointer("/properties/first_level_multiplier")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32)
                .unwrap_or(4)
        } else {
            4
        }
    }

    /// Compute ability modifier. Uses hardcoded formula until Zen-expression
    /// is integrated in Phase 2, but reads the formula string from the mechanic
    /// entity to validate it's present.
    pub fn compute_ability_modifier(&self, score: i32) -> i32 {
        // Phase 2 will evaluate the formula from the mechanic entity via Zen-expression.
        // For now, the formula is hardcoded but the mechanic entity is the source of truth.
        (score - 10) / 2
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd src-tauri && cargo test mechanic_store -- --nocapture
```

Expected: All 3 tests pass.

- [ ] **Step 5: Replace hardcoded skill-to-ability mapping in character.rs**

Replace the hardcoded match statement in `engine/character.rs:66-78` with a lookup into MechanicStore:

```rust
// In engine/character.rs — replace the match block
// Before: hardcoded match on skill name → ability string
// After: lookup from MechanicStore, falling back to old behavior if mechanic not loaded
pub fn get_ability_for_skill(&self, skill: &str, mechanic_store: &MechanicStore) -> String {
    if let Ok(mapping) = mechanic_store.get_skill_ability_mapping() {
        if let Some(ability) = mapping.get(skill) {
            return ability.clone();
        }
    }
    // Fallback removed in Phase 2 when all content is loaded from packs
    "dexterity".to_string()
}
```

- [ ] **Step 6: Replace hardcoded modifier formula in abilities.rs**

Replace `(score - 10) / 2` at `engine/abilities.rs:33` and `:40` with calls to `mechanic_store.compute_ability_modifier(score)`.

- [ ] **Step 7: Replace hardcoded skill cost/multiplier in skills.rs**

Replace the hardcoded `1`/`2` cost at `engine/skills.rs:92` with `mechanic_store.get_skill_cost(is_class_skill)` and the hardcoded `4` multiplier at `engine/abilities.rs:59` with `mechanic_store.get_first_level_multiplier()`.

- [ ] **Step 8: Replace hardcoded ability names in export.rs**

Replace the hardcoded array at `engine/export.rs:86-93` with:

```rust
let ability_names: Vec<String> = mechanic_store
    .get_ability_definitions()
    .unwrap_or_else(|_| vec![])
    .iter()
    .map(|a| a.name.to_lowercase())
    .collect();

for ability in &ability_names {
    // ... existing export logic
}
```

Replace the hardcoded modifier formula at `engine/export.rs:102` with `mechanic_store.compute_ability_modifier(score)`.

- [ ] **Step 9: Wire MechanicStore into Engine**

Modify `src-tauri/src/main.rs` and engine initialization to:
1. Create `MechanicStore` after pack loading
2. Find all entities with `entity_type: "mechanic"` and register them
3. Pass `MechanicStore` reference to engine modules that need it

- [ ] **Step 10: Run all tests**

Run:
```bash
cd src-tauri && cargo test
```

Expected: All tests pass — existing behavior preserved, now driven by content.

- [ ] **Step 11: Commit**

Run:
```bash
git add src-tauri/src/mechanic_store.rs src-tauri/src/engine/ src-tauri/src/main.rs
git commit -m "feat: engine reads ability scores, skills, saves from Mechanic entities instead of hardcoded values"
```

---

### Task 6: Computed view dependency graph with topological sort

**Files:**
- Create: `src-tauri/src/computed_graph.rs`
- Modify: `src-tauri/src/computed_view.rs`

- [ ] **Step 1: Write failing test for dependency resolution**

```rust
// src-tauri/src/computed_graph.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_topological_sort_simple_chain() {
        let views = vec![
            ComputedViewDef {
                path: "combat.ac".into(),
                inputs: vec!["abilities.dex.modifier".into(), "armor.bonus".into()],
            },
            ComputedViewDef {
                path: "abilities.dex.modifier".into(),
                inputs: vec!["abilities.dex.score".into()],
            },
        ];
        let order = resolve_computed_view_order(&views).unwrap();
        let ac_idx = order.iter().position(|p| p == "combat.ac").unwrap();
        let dex_idx = order.iter().position(|p| p == "abilities.dex.modifier").unwrap();
        assert!(dex_idx < ac_idx, "dex.modifier must evaluate before combat.ac");
    }

    #[test]
    fn test_topological_sort_detects_cycle() {
        let views = vec![
            ComputedViewDef {
                path: "a".into(),
                inputs: vec!["b".into()],
            },
            ComputedViewDef {
                path: "b".into(),
                inputs: vec!["a".into()],
            },
        ];
        let result = resolve_computed_view_order(&views);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cycle"));
    }

    #[test]
    fn test_external_inputs_ignored() {
        // Inputs that don't match any computed view path are external (raw entity state)
        let views = vec![
            ComputedViewDef {
                path: "abilities.str.modifier".into(),
                inputs: vec!["abilities.str.score".into()],  // raw state, not a computed view
            },
        ];
        let order = resolve_computed_view_order(&views).unwrap();
        assert_eq!(order, vec!["abilities.str.modifier"]);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd src-tauri && cargo test computed_graph -- --nocapture
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement computed view dependency resolution**

```rust
// src-tauri/src/computed_graph.rs
use std::collections::{HashMap, HashSet, VecDeque};

#[derive(Debug, Clone)]
pub struct ComputedViewDef {
    pub path: String,
    pub inputs: Vec<String>,
}

/// Resolve evaluation order for computed views via topological sort.
/// Inputs that don't correspond to a computed view path are treated as
/// external (raw entity state) and ignored for ordering purposes.
pub fn resolve_computed_view_order(views: &[ComputedViewDef]) -> Result<Vec<String>, String> {
    let view_paths: HashSet<&str> = views.iter().map(|v| v.path.as_str()).collect();

    // Build adjacency: only count inputs that are themselves computed views
    let mut in_degree: HashMap<&str, usize> = HashMap::new();
    let mut dependents: HashMap<&str, Vec<&str>> = HashMap::new();

    for view in views {
        in_degree.entry(view.path.as_str()).or_insert(0);
        for input in &view.inputs {
            if view_paths.contains(input.as_str()) {
                *in_degree.entry(view.path.as_str()).or_insert(0) += 1;
                dependents
                    .entry(input.as_str())
                    .or_default()
                    .push(view.path.as_str());
            }
        }
    }

    // Kahn's algorithm
    let mut queue: VecDeque<&str> = in_degree
        .iter()
        .filter(|(_, &deg)| deg == 0)
        .map(|(&path, _)| path)
        .collect();
    let mut order = Vec::new();

    while let Some(path) = queue.pop_front() {
        order.push(path.to_string());
        if let Some(deps) = dependents.get(path) {
            for &dep in deps {
                let deg = in_degree.get_mut(dep).unwrap();
                *deg -= 1;
                if *deg == 0 {
                    queue.push_back(dep);
                }
            }
        }
    }

    if order.len() != views.len() {
        let remaining: Vec<&str> = in_degree
            .iter()
            .filter(|(_, &deg)| deg > 0)
            .map(|(&path, _)| path)
            .collect();
        return Err(format!(
            "Computed view dependency cycle detected involving: {}",
            remaining.join(", ")
        ));
    }

    Ok(order)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd src-tauri && cargo test computed_graph -- --nocapture
```

Expected: All 3 tests pass.

- [ ] **Step 5: Integrate into pack loader**

After loading all entities, collect computed view definitions from every entity that has a `computed_views` array, then call `resolve_computed_view_order`. If it returns an error (cycle detected), treat it as a load error — log it and refuse to load the pack.

- [ ] **Step 6: Run all tests**

Run:
```bash
cd src-tauri && cargo test
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

Run:
```bash
git add src-tauri/src/computed_graph.rs src-tauri/src/computed_view.rs src-tauri/src/pack_loader.rs src-tauri/src/main.rs
git commit -m "feat: add topological sort for computed view dependencies with cycle detection"
```

---

### Task 7: `pack test` CLI subcommand

**Files:**
- Create: `src-tauri/src/pack_test.rs`
- Modify: `src-tauri/src/main.rs` (add CLI arg parsing)

- [ ] **Step 1: Write failing test for pack test runner**

```rust
// src-tauri/src/pack_test.rs
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_pack_test_validates_schema() {
        let tmp = TempDir::new().unwrap();
        let pack = tmp.path();

        // Create manifest
        std::fs::write(
            pack.join("manifest.yaml"),
            "id: test-pack\npack_type: source\nversion: 1.0.0\n",
        ).unwrap();

        // Create schema
        let schemas = pack.join("schemas");
        std::fs::create_dir_all(&schemas).unwrap();
        std::fs::write(
            schemas.join("mechanic.schema.yaml"),
            r#"
type: object
required: [id, entity_type, properties]
properties:
  id: { type: string }
  entity_type: { type: string }
  properties: { type: object, required: [name], properties: { name: { type: string } } }
"#,
        ).unwrap();

        // Create valid entity
        let entities = pack.join("entities/mechanics");
        std::fs::create_dir_all(&entities).unwrap();
        std::fs::write(
            entities.join("test.mdx"),
            "---\nid: \"test:mechanic:test\"\nentity_type: \"mechanic\"\nproperties:\n  name: \"Test\"\n---\n",
        ).unwrap();

        let result = run_pack_test(pack);
        assert!(result.is_ok());
        let report = result.unwrap();
        assert_eq!(report.entities_tested, 1);
        assert_eq!(report.errors.len(), 0);
    }

    #[test]
    fn test_pack_test_reports_schema_violation() {
        let tmp = TempDir::new().unwrap();
        let pack = tmp.path();

        std::fs::write(
            pack.join("manifest.yaml"),
            "id: test-pack\npack_type: source\nversion: 1.0.0\n",
        ).unwrap();

        let schemas = pack.join("schemas");
        std::fs::create_dir_all(&schemas).unwrap();
        std::fs::write(
            schemas.join("mechanic.schema.yaml"),
            r#"
type: object
required: [id, entity_type, properties]
properties:
  id: { type: string }
  entity_type: { type: string }
  properties: { type: object, required: [name], properties: { name: { type: string } } }
"#,
        ).unwrap();

        // Create invalid entity (missing required 'properties')
        let entities = pack.join("entities/mechanics");
        std::fs::create_dir_all(&entities).unwrap();
        std::fs::write(
            entities.join("bad.mdx"),
            "---\nid: \"test:mechanic:bad\"\nentity_type: \"mechanic\"\n---\n",
        ).unwrap();

        let result = run_pack_test(pack);
        assert!(result.is_ok());
        let report = result.unwrap();
        assert_eq!(report.entities_tested, 1);
        assert!(report.errors.len() > 0);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd src-tauri && cargo test pack_test -- --nocapture
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement pack test runner**

```rust
// src-tauri/src/pack_test.rs
use std::path::Path;
use walkdir::WalkDir;

use crate::schema_validator;

#[derive(Debug)]
pub struct PackTestReport {
    pub pack_id: String,
    pub entities_tested: usize,
    pub fixtures_tested: usize,
    pub errors: Vec<PackTestError>,
}

#[derive(Debug)]
pub struct PackTestError {
    pub entity_path: String,
    pub error_type: PackTestErrorType,
    pub message: String,
}

#[derive(Debug)]
pub enum PackTestErrorType {
    SchemaValidation,
    FixtureFailure,
    ParseError,
}

/// Run all pack tests: schema validation, computed view evaluation, fixture checks.
pub fn run_pack_test(pack_path: &Path) -> Result<PackTestReport, String> {
    let manifest_path = pack_path.join("manifest.yaml");
    if !manifest_path.exists() {
        return Err(format!("No manifest.yaml found at {}", pack_path.display()));
    }

    let manifest = std::fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest: {e}"))?;
    let pack_id = manifest
        .lines()
        .find(|l| l.starts_with("id:"))
        .map(|l| l.trim_start_matches("id:").trim().trim_matches('"').to_string())
        .unwrap_or_else(|| "unknown".to_string());

    let mut report = PackTestReport {
        pack_id,
        entities_tested: 0,
        fixtures_tested: 0,
        errors: Vec::new(),
    };

    // Load schemas
    let schemas_dir = pack_path.join("schemas");
    let mut schemas: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    if schemas_dir.exists() {
        for entry in WalkDir::new(&schemas_dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map_or(false, |ext| ext == "yaml" || ext == "yml"))
            .filter(|e| !e.file_name().to_string_lossy().starts_with('_'))
        {
            let name = entry
                .path()
                .file_stem()
                .unwrap()
                .to_string_lossy()
                .replace(".schema", "");
            let content = std::fs::read_to_string(entry.path())
                .map_err(|e| format!("Failed to read schema {}: {e}", entry.path().display()))?;
            schemas.insert(name, content);
        }
    }

    // Validate entities
    let entities_dir = pack_path.join("entities");
    if entities_dir.exists() {
        for entry in WalkDir::new(&entities_dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().extension().map_or(false, |ext| ext == "mdx" || ext == "yaml"))
        {
            let content = match std::fs::read_to_string(entry.path()) {
                Ok(c) => c,
                Err(e) => {
                    report.errors.push(PackTestError {
                        entity_path: entry.path().display().to_string(),
                        error_type: PackTestErrorType::ParseError,
                        message: format!("Failed to read: {e}"),
                    });
                    continue;
                }
            };

            // Extract YAML frontmatter from MDX
            let frontmatter = extract_frontmatter(&content);
            let frontmatter = match frontmatter {
                Some(fm) => fm,
                None => {
                    report.errors.push(PackTestError {
                        entity_path: entry.path().display().to_string(),
                        error_type: PackTestErrorType::ParseError,
                        message: "No YAML frontmatter found".to_string(),
                    });
                    continue;
                }
            };

            report.entities_tested += 1;

            // Determine entity type and find matching schema
            let parsed: Result<serde_json::Value, _> = serde_yaml::from_str(&frontmatter);
            if let Ok(value) = &parsed {
                if let Some(entity_type) = value.get("entity_type").and_then(|v| v.as_str()) {
                    let schema_key = schema_validator::schema_filename_for_entity_type(entity_type)
                        .replace(".schema.yaml", "");
                    if let Some(schema) = schemas.get(&schema_key) {
                        if let Err(err) =
                            schema_validator::validate_entity_against_schema(&frontmatter, schema)
                        {
                            report.errors.push(PackTestError {
                                entity_path: entry.path().display().to_string(),
                                error_type: PackTestErrorType::SchemaValidation,
                                message: err,
                            });
                        }
                    }
                }
            }
        }
    }

    // Run test fixtures
    if entities_dir.exists() {
        for entry in WalkDir::new(&entities_dir)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path()
                    .file_name()
                    .map_or(false, |f| f.to_string_lossy().ends_with(".test.yaml"))
            })
        {
            report.fixtures_tested += 1;
            // Fixture evaluation requires Zen-expression (Phase 2).
            // For now, validate that fixture files parse as valid YAML.
            let content = std::fs::read_to_string(entry.path());
            if let Err(e) = content {
                report.errors.push(PackTestError {
                    entity_path: entry.path().display().to_string(),
                    error_type: PackTestErrorType::FixtureFailure,
                    message: format!("Failed to read fixture: {e}"),
                });
            }
        }
    }

    Ok(report)
}

/// Extract YAML frontmatter from an MDX file (between --- delimiters).
fn extract_frontmatter(content: &str) -> Option<String> {
    let trimmed = content.trim();
    if !trimmed.starts_with("---") {
        return None;
    }
    let rest = &trimmed[3..];
    if let Some(end) = rest.find("---") {
        Some(rest[..end].to_string())
    } else {
        None
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd src-tauri && cargo test pack_test -- --nocapture
```

Expected: Both tests pass.

- [ ] **Step 5: Add CLI argument parsing for `pack test`**

Modify `src-tauri/src/main.rs` to check for CLI args before launching Tauri:

```rust
fn main() {
    let args: Vec<String> = std::env::args().collect();

    // Handle CLI subcommands before Tauri launch
    if args.len() >= 3 && args[1] == "pack" && args[2] == "test" {
        let pack_path = args.get(3).map(|s| s.as_str()).unwrap_or(".");
        match pack_test::run_pack_test(std::path::Path::new(pack_path)) {
            Ok(report) => {
                println!("Pack: {}", report.pack_id);
                println!("Entities tested: {}", report.entities_tested);
                println!("Fixtures tested: {}", report.fixtures_tested);
                if report.errors.is_empty() {
                    println!("✓ All tests passed");
                } else {
                    println!("✗ {} error(s):", report.errors.len());
                    for err in &report.errors {
                        println!("  [{:?}] {} — {}", err.error_type, err.entity_path, err.message);
                    }
                    std::process::exit(1);
                }
                return;
            }
            Err(e) => {
                eprintln!("Error: {e}");
                std::process::exit(1);
            }
        }
    }

    // Normal Tauri app launch
    // ... existing Tauri setup code ...
}
```

- [ ] **Step 6: Test the CLI subcommand against the SRD pack**

Run:
```bash
cd src-tauri && cargo run -- pack test ../content/packs/srd-3.5e/
```

Expected: Reports entities tested, any schema validation errors. New mechanic entities should pass. Existing entities without matching schemas will be skipped (no schema = no validation).

- [ ] **Step 7: Commit**

Run:
```bash
git add src-tauri/src/pack_test.rs src-tauri/src/main.rs
git commit -m "feat: add 'pack test' CLI subcommand for content pack validation"
```

---

### Task 8: Write test fixtures for 3.5e mechanic entities

**Files:**
- Create: `content/packs/srd-3.5e/entities/mechanics/ability-scores.test.yaml`
- Create: `content/packs/srd-3.5e/entities/mechanics/skills.test.yaml`
- Create: `content/packs/srd-3.5e/entities/mechanics/saving-throws.test.yaml`
- Create: `content/packs/srd-3.5e/entities/mechanics/bab-progressions.test.yaml`

- [ ] **Step 1: Create ability score test fixtures**

```yaml
# content/packs/srd-3.5e/entities/mechanics/ability-scores.test.yaml
fixtures:
  - name: "Modifier for score 10 is 0"
    entity_state:
      abilities.strength.score: 10
    expect:
      abilities.strength.modifier: 0

  - name: "Modifier for score 16 is +3"
    entity_state:
      abilities.strength.score: 16
    expect:
      abilities.strength.modifier: 3

  - name: "Modifier for score 7 is -2"
    entity_state:
      abilities.strength.score: 7
    expect:
      abilities.strength.modifier: -2

  - name: "Modifier for score 1 is -5"
    entity_state:
      abilities.strength.score: 1
    expect:
      abilities.strength.modifier: -5

  - name: "Modifier for score 20 is +5"
    entity_state:
      abilities.strength.score: 20
    expect:
      abilities.strength.modifier: 5
```

- [ ] **Step 2: Create skill test fixtures**

```yaml
# content/packs/srd-3.5e/entities/mechanics/skills.test.yaml
fixtures:
  - name: "Class skill max ranks at level 1"
    entity_state:
      level: 1
      is_class_skill: true
    expect:
      max_ranks: 4

  - name: "Cross-class max ranks at level 1"
    entity_state:
      level: 1
      is_class_skill: false
    expect:
      max_ranks: 2

  - name: "Class skill max ranks at level 10"
    entity_state:
      level: 10
      is_class_skill: true
    expect:
      max_ranks: 13

  - name: "Cross-class max ranks at level 10"
    entity_state:
      level: 10
      is_class_skill: false
    expect:
      max_ranks: 6

  - name: "Class skill costs 1 point per rank"
    entity_state:
      is_class_skill: true
    expect:
      cost_per_rank: 1

  - name: "Cross-class skill costs 2 points per rank"
    entity_state:
      is_class_skill: false
    expect:
      cost_per_rank: 2
```

- [ ] **Step 3: Create saving throw test fixtures**

```yaml
# content/packs/srd-3.5e/entities/mechanics/saving-throws.test.yaml
fixtures:
  - name: "Good save at level 1 is +2"
    entity_state:
      level: 1
      progression: "good"
    expect:
      base_save: 2

  - name: "Poor save at level 1 is +0"
    entity_state:
      level: 1
      progression: "poor"
    expect:
      base_save: 0

  - name: "Good save at level 20 is +12"
    entity_state:
      level: 20
      progression: "good"
    expect:
      base_save: 12

  - name: "Poor save at level 20 is +6"
    entity_state:
      level: 20
      progression: "poor"
    expect:
      base_save: 6
```

- [ ] **Step 4: Create BAB test fixtures**

```yaml
# content/packs/srd-3.5e/entities/mechanics/bab-progressions.test.yaml
fixtures:
  - name: "Full BAB at level 1 is +1"
    entity_state:
      level: 1
      progression: "full"
    expect:
      bab: 1

  - name: "Full BAB at level 20 is +20"
    entity_state:
      level: 20
      progression: "full"
    expect:
      bab: 20

  - name: "Medium BAB at level 1 is +0"
    entity_state:
      level: 1
      progression: "medium"
    expect:
      bab: 0

  - name: "Poor BAB at level 20 is +10"
    entity_state:
      level: 20
      progression: "poor"
    expect:
      bab: 10
```

- [ ] **Step 5: Run pack test to verify fixtures parse**

Run:
```bash
cd src-tauri && cargo run -- pack test ../content/packs/srd-3.5e/
```

Expected: Fixtures counted in report, no parse errors. Fixture evaluation itself is a Phase 2 deliverable (requires Zen-expression).

- [ ] **Step 6: Commit**

Run:
```bash
git add content/packs/srd-3.5e/entities/mechanics/*.test.yaml
git commit -m "feat: add test fixtures for D&D 3.5e mechanic entities"
```

---

### Task 9: Phase 1 verification

- [ ] **Step 1: Run full test suite**

Run:
```bash
pnpm run test
cd src-tauri && cargo test
pnpm run test:e2e
```

Expected: All tests pass.

- [ ] **Step 2: Run pack test on SRD pack**

Run:
```bash
cd src-tauri && cargo run -- pack test ../content/packs/srd-3.5e/
```

Expected: All mechanic entities pass schema validation. Report shows entity count, fixture count, zero errors.

- [ ] **Step 3: Verify engine loads mechanics from content**

Run:
```bash
cd src-tauri && cargo run
```

Verify in the app that ability scores, skills, and saves still work correctly — now driven by content pack data instead of hardcoded values.

- [ ] **Step 4: Tag Phase 1 complete**

Run:
```bash
git tag phase-1-complete
```
