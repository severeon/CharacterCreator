# Phase 5: DM Authority + Campaign Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full campaign pack lifecycle — creation, copy-on-write overrides, Rule of Cool forward-patching, event log viewer, permission enforcement, and campaign publishing.

**Architecture:** Campaign packs are mutable layers on top of immutable source packs. The engine resolves entities by walking: campaign overrides → campaign homebrew → supplement packs → source packs. DM overrides use copy-on-write — the source entity is copied into the campaign layer on first modification. The event log is append-only. Rule of Cool inserts compensating events rather than rewriting history. Permission guards enforce observer/player/DM roles at the IPC layer.

**Tech Stack:** Rust (serde, tauri IPC), React (event log viewer, Rule of Cool UI)

**Prerequisites:** Phases 1-4 complete. Content packs load with schemas (Phase 1), subscriptions evaluate (Phase 2), workflows are data-driven (Phase 3), UI renders from layouts (Phase 4).

---

### Task 1: Campaign pack creation from source selection

**Files:**
- Create: `src-tauri/src/campaign.rs`
- Modify: `src-tauri/src/ipc.rs`
- Test: inline in `campaign.rs`

- [ ] **Step 1: Write failing test for campaign creation**

```rust
// src-tauri/src/campaign.rs
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_create_campaign_pack() {
        let tmp = TempDir::new().unwrap();
        let result = create_campaign(
            "monday-night",
            "Monday Night Game",
            &["srd-3.5e", "complete-warrior"],
            tmp.path(),
        );
        assert!(result.is_ok());
        let campaign_path = result.unwrap();

        // Verify directory structure
        assert!(campaign_path.join("manifest.yaml").exists());
        assert!(campaign_path.join("overrides/entities").exists());
        assert!(campaign_path.join("homebrew/entities").exists());
        assert!(campaign_path.join("event_log").exists());
        assert!(campaign_path.join("state").exists());

        // Verify manifest content
        let manifest = std::fs::read_to_string(campaign_path.join("manifest.yaml")).unwrap();
        assert!(manifest.contains("pack_type: campaign"));
        assert!(manifest.contains("monday-night"));
        assert!(manifest.contains("srd-3.5e"));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd src-tauri && cargo test test_create_campaign_pack -- --nocapture
```

Expected: FAIL — function doesn't exist.

- [ ] **Step 3: Implement campaign creation**

```rust
// src-tauri/src/campaign.rs
use std::path::{Path, PathBuf};
use std::fs;

/// Create a new campaign pack directory with the required structure.
pub fn create_campaign(
    id: &str,
    name: &str,
    source_packs: &[&str],
    campaigns_dir: &Path,
) -> Result<PathBuf, String> {
    let campaign_path = campaigns_dir.join(id);
    if campaign_path.exists() {
        return Err(format!("Campaign '{}' already exists", id));
    }

    // Create directory structure
    let dirs = [
        "overrides/entities",
        "homebrew/entities",
        "rules/subscriptions",
        "rules/workflows",
        "event_log",
        "state",
    ];
    for dir in &dirs {
        fs::create_dir_all(campaign_path.join(dir))
            .map_err(|e| format!("Failed to create {}: {e}", dir))?;
    }

    // Write manifest
    let sources_yaml: String = source_packs
        .iter()
        .map(|s| format!("  - id: \"{}\"\n    version: \"1.0.0\"", s))
        .collect::<Vec<_>>()
        .join("\n");

    let manifest = format!(
        "id: \"{}\"\nname: \"{}\"\nversion: \"0.1.0-draft\"\npack_type: campaign\nsystem: \"dnd-3.5e\"\nsources:\n{}\n",
        id, name, sources_yaml
    );
    fs::write(campaign_path.join("manifest.yaml"), manifest)
        .map_err(|e| format!("Failed to write manifest: {e}"))?;

    // Initialize empty event log
    fs::write(campaign_path.join("event_log/events.jsonl"), "")
        .map_err(|e| format!("Failed to init event log: {e}"))?;

    Ok(campaign_path)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd src-tauri && cargo test test_create_campaign_pack -- --nocapture
```

Expected: PASS.

- [ ] **Step 5: Add IPC command**

```rust
#[tauri::command]
pub fn create_campaign_pack(
    id: String,
    name: String,
    source_packs: Vec<String>,
    campaigns_dir: String,
) -> Result<String, String> {
    let sources: Vec<&str> = source_packs.iter().map(|s| s.as_str()).collect();
    let path = crate::campaign::create_campaign(&id, &name, &sources, Path::new(&campaigns_dir))?;
    Ok(path.display().to_string())
}
```

- [ ] **Step 6: Commit**

Run:
```bash
git add src-tauri/src/campaign.rs src-tauri/src/ipc.rs src-tauri/src/main.rs
git commit -m "feat: add campaign pack creation from source selection"
```

---

### Task 2: Copy-on-write entity override mechanism

**Files:**
- Modify: `src-tauri/src/campaign.rs`
- Modify: `src-tauri/src/pack_loader.rs`

- [ ] **Step 1: Write failing test for copy-on-write**

```rust
#[test]
fn test_copy_on_write_override() {
    let tmp = TempDir::new().unwrap();
    let campaign_path = create_campaign("test", "Test", &["srd-3.5e"], tmp.path()).unwrap();

    // Simulate overriding a source entity
    let result = override_entity(
        &campaign_path,
        "srd:class:fighter",
        r#"---
id: "srd:class:fighter"
entity_type: "template.class"
properties:
  name: "Fighter"
  hd: 12
---"#,
    );
    assert!(result.is_ok());

    // Verify override file was created
    let override_path = campaign_path.join("overrides/entities/srd__class__fighter.mdx");
    assert!(override_path.exists());
    let content = std::fs::read_to_string(&override_path).unwrap();
    assert!(content.contains("hd: 12"));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd src-tauri && cargo test test_copy_on_write_override -- --nocapture
```

Expected: FAIL — `override_entity` doesn't exist.

- [ ] **Step 3: Implement copy-on-write**

```rust
/// Override a source entity in the campaign layer (copy-on-write).
/// The entity is written to overrides/entities/ with a sanitized filename.
pub fn override_entity(
    campaign_path: &Path,
    entity_id: &str,
    content: &str,
) -> Result<PathBuf, String> {
    let overrides_dir = campaign_path.join("overrides/entities");
    fs::create_dir_all(&overrides_dir)
        .map_err(|e| format!("Failed to create overrides dir: {e}"))?;

    // Sanitize entity ID for filename: replace : with __
    let filename = format!("{}.mdx", entity_id.replace(':', "__"));
    let override_path = overrides_dir.join(&filename);

    fs::write(&override_path, content)
        .map_err(|e| format!("Failed to write override: {e}"))?;

    Ok(override_path)
}
```

- [ ] **Step 4: Implement entity resolution order in pack loader**

Modify `pack_loader.rs` to resolve entities by walking:
1. Campaign overrides (`overrides/entities/`)
2. Campaign homebrew (`homebrew/entities/`)
3. Supplement packs (in dependency order)
4. Source packs

```rust
/// Resolve an entity ID across the pack stack.
/// Returns the first match found in priority order.
pub fn resolve_entity(
    entity_id: &str,
    campaign_path: Option<&Path>,
    loaded_packs: &[LoadedPack],
) -> Option<Entity> {
    // 1. Check campaign overrides
    if let Some(campaign) = campaign_path {
        let override_file = campaign
            .join("overrides/entities")
            .join(format!("{}.mdx", entity_id.replace(':', "__")));
        if override_file.exists() {
            if let Ok(entity) = load_entity_from_file(&override_file) {
                return Some(entity);
            }
        }

        // 2. Check campaign homebrew
        let homebrew_file = campaign
            .join("homebrew/entities")
            .join(format!("{}.mdx", entity_id.replace(':', "__")));
        if homebrew_file.exists() {
            if let Ok(entity) = load_entity_from_file(&homebrew_file) {
                return Some(entity);
            }
        }
    }

    // 3-4. Check loaded packs (already in dependency order)
    for pack in loaded_packs {
        if let Some(entity) = pack.entities.get(entity_id) {
            return Some(entity.clone());
        }
    }

    None
}
```

- [ ] **Step 5: Run tests**

Run:
```bash
cd src-tauri && cargo test -- --nocapture
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

Run:
```bash
git add src-tauri/src/campaign.rs src-tauri/src/pack_loader.rs
git commit -m "feat: add copy-on-write entity override and resolution order"
```

---

### Task 3: Event log and Rule of Cool forward-patching

**Files:**
- Create: `src-tauri/src/event_log.rs`
- Modify: `src-tauri/src/ipc.rs`

- [ ] **Step 1: Write failing test for event log append**

```rust
// src-tauri/src/event_log.rs
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_append_event() {
        let tmp = TempDir::new().unwrap();
        let log_path = tmp.path().join("events.jsonl");

        let event = GameEvent {
            id: "evt-001".into(),
            timestamp: "2026-04-01T20:00:00Z".into(),
            op: "set".into(),
            path: "abilities.str.score".into(),
            value: serde_json::json!(18),
            source: "player:tom".into(),
            event_type: EventType::Normal,
            note: None,
            previous_ops_referenced: vec![],
        };

        append_event(&log_path, &event).unwrap();

        let content = std::fs::read_to_string(&log_path).unwrap();
        assert!(content.contains("evt-001"));
        assert!(content.contains("abilities.str.score"));
    }

    #[test]
    fn test_rule_of_cool_patch() {
        let tmp = TempDir::new().unwrap();
        let log_path = tmp.path().join("events.jsonl");

        // Original event
        let original = GameEvent {
            id: "evt-001".into(),
            timestamp: "2026-04-01T20:00:00Z".into(),
            op: "set".into(),
            path: "inventory.gold".into(),
            value: serde_json::json!(50),
            source: "player:tom".into(),
            event_type: EventType::Normal,
            note: None,
            previous_ops_referenced: vec![],
        };
        append_event(&log_path, &original).unwrap();

        // Rule of Cool patch — compensating event, not a rewrite
        let patch = GameEvent {
            id: "evt-002".into(),
            timestamp: "2026-04-01T20:15:00Z".into(),
            op: "set".into(),
            path: "inventory.gold".into(),
            value: serde_json::json!(8315),
            source: "dm:rule-of-cool".into(),
            event_type: EventType::RuleOfCool,
            note: Some("The merchant recognized the party's sigil — old debt forgiven".into()),
            previous_ops_referenced: vec!["evt-001".into()],
        };
        append_event(&log_path, &patch).unwrap();

        let events = read_events(&log_path).unwrap();
        assert_eq!(events.len(), 2);
        assert_eq!(events[1].source, "dm:rule-of-cool");
        assert!(events[1].note.is_some());
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd src-tauri && cargo test event_log -- --nocapture
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement event log**

```rust
// src-tauri/src/event_log.rs
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EventType {
    Normal,
    RuleOfCool,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameEvent {
    pub id: String,
    pub timestamp: String,
    pub op: String,
    pub path: String,
    pub value: serde_json::Value,
    pub source: String,
    pub event_type: EventType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub previous_ops_referenced: Vec<String>,
}

/// Append an event to the JSONL event log (append-only).
pub fn append_event(log_path: &Path, event: &GameEvent) -> Result<(), String> {
    let json = serde_json::to_string(event)
        .map_err(|e| format!("Failed to serialize event: {e}"))?;

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| format!("Failed to open event log: {e}"))?;

    writeln!(file, "{}", json)
        .map_err(|e| format!("Failed to write event: {e}"))?;

    Ok(())
}

/// Read all events from the JSONL event log.
pub fn read_events(log_path: &Path) -> Result<Vec<GameEvent>, String> {
    let content = fs::read_to_string(log_path)
        .map_err(|e| format!("Failed to read event log: {e}"))?;

    content
        .lines()
        .filter(|l| !l.trim().is_empty())
        .map(|line| {
            serde_json::from_str(line)
                .map_err(|e| format!("Failed to parse event: {e}"))
        })
        .collect()
}

/// Query events by type (e.g., get all errors or all Rule of Cool patches).
pub fn query_events_by_type(
    log_path: &Path,
    event_type: EventType,
) -> Result<Vec<GameEvent>, String> {
    let events = read_events(log_path)?;
    Ok(events.into_iter().filter(|e| e.event_type == event_type).collect())
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd src-tauri && cargo test event_log -- --nocapture
```

Expected: Both tests pass.

- [ ] **Step 5: Add IPC commands for event log and Rule of Cool**

```rust
#[tauri::command]
pub fn get_event_log(campaign_path: String) -> Result<Vec<crate::event_log::GameEvent>, String> {
    let log_path = Path::new(&campaign_path).join("event_log/events.jsonl");
    crate::event_log::read_events(&log_path)
}

#[tauri::command]
pub fn apply_rule_of_cool(
    campaign_path: String,
    op: String,
    path: String,
    value: serde_json::Value,
    note: String,
    referenced_events: Vec<String>,
) -> Result<(), String> {
    let log_path = Path::new(&campaign_path).join("event_log/events.jsonl");
    let event = crate::event_log::GameEvent {
        id: format!("evt-{}", uuid::Uuid::new_v4()),
        timestamp: chrono_or_manual_timestamp(),
        op,
        path,
        value,
        source: "dm:rule-of-cool".to_string(),
        event_type: crate::event_log::EventType::RuleOfCool,
        note: Some(note),
        previous_ops_referenced: referenced_events,
    };
    crate::event_log::append_event(&log_path, &event)
}

fn chrono_or_manual_timestamp() -> String {
    // Simple timestamp without chrono dependency
    "2026-04-01T00:00:00Z".to_string() // Replace with real timestamp in production
}
```

- [ ] **Step 6: Commit**

Run:
```bash
git add src-tauri/src/event_log.rs src-tauri/src/ipc.rs src-tauri/src/main.rs
git commit -m "feat: add append-only event log with Rule of Cool forward-patching"
```

---

### Task 4: Permission guard enforcement

**Files:**
- Create: `src-tauri/src/permission.rs`
- Modify: `src-tauri/src/ipc.rs`

- [ ] **Step 1: Write failing test for permission enforcement**

```rust
// src-tauri/src/permission.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_observer_cannot_modify() {
        let guard = PermissionGuard::new(Role::Observer);
        assert!(guard.check(Action::ReadState).is_ok());
        assert!(guard.check(Action::ModifyCharacter).is_err());
        assert!(guard.check(Action::RuleOfCool).is_err());
    }

    #[test]
    fn test_player_can_modify_own_character() {
        let guard = PermissionGuard::new(Role::Player);
        assert!(guard.check(Action::ReadState).is_ok());
        assert!(guard.check(Action::ModifyCharacter).is_ok());
        assert!(guard.check(Action::RuleOfCool).is_err());
        assert!(guard.check(Action::OverrideEntity).is_err());
    }

    #[test]
    fn test_dm_can_do_everything() {
        let guard = PermissionGuard::new(Role::DM);
        assert!(guard.check(Action::ReadState).is_ok());
        assert!(guard.check(Action::ModifyCharacter).is_ok());
        assert!(guard.check(Action::RuleOfCool).is_ok());
        assert!(guard.check(Action::OverrideEntity).is_ok());
        assert!(guard.check(Action::ViewEventLog).is_ok());
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd src-tauri && cargo test permission -- --nocapture
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement permission guard**

```rust
// src-tauri/src/permission.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum Role {
    Observer,
    Player,
    DM,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Action {
    ReadState,
    ModifyCharacter,
    RuleOfCool,
    OverrideEntity,
    ViewEventLog,
    CreateHomebrew,
    PublishCampaign,
}

pub struct PermissionGuard {
    role: Role,
}

impl PermissionGuard {
    pub fn new(role: Role) -> Self {
        Self { role }
    }

    pub fn check(&self, action: Action) -> Result<(), String> {
        let allowed = match self.role {
            Role::Observer => matches!(action, Action::ReadState),
            Role::Player => matches!(action, Action::ReadState | Action::ModifyCharacter),
            Role::DM => true,
        };

        if allowed {
            Ok(())
        } else {
            Err(format!(
                "{:?} does not have permission to {:?}",
                self.role, action
            ))
        }
    }

    pub fn role(&self) -> Role {
        self.role
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd src-tauri && cargo test permission -- --nocapture
```

Expected: All 3 tests pass.

- [ ] **Step 5: Wire permission guard into IPC commands**

Add permission checks to sensitive IPC commands. Example:

```rust
#[tauri::command]
pub fn apply_rule_of_cool(
    role: crate::permission::Role,
    // ... other params
) -> Result<(), String> {
    let guard = crate::permission::PermissionGuard::new(role);
    guard.check(crate::permission::Action::RuleOfCool)?;
    // ... existing logic
}
```

- [ ] **Step 6: Commit**

Run:
```bash
git add src-tauri/src/permission.rs src-tauri/src/ipc.rs src-tauri/src/main.rs
git commit -m "feat: add permission guard enforcement for observer/player/DM roles"
```

---

### Task 5: Campaign publish (strip event log, freeze version)

**Files:**
- Modify: `src-tauri/src/campaign.rs`
- Note: Uses `pack_export::export_campaign` from Phase 6 Task 3

- [ ] **Step 1: Write failing test for campaign publish**

```rust
#[test]
fn test_publish_campaign() {
    let tmp = TempDir::new().unwrap();
    let campaign_path = create_campaign("test", "Test", &["srd-3.5e"], tmp.path()).unwrap();

    // Add some events
    let log_path = campaign_path.join("event_log/events.jsonl");
    std::fs::write(&log_path, "{\"id\":\"evt-1\"}\n{\"id\":\"evt-2\"}\n").unwrap();

    // Add a homebrew entity
    let homebrew = campaign_path.join("homebrew/entities");
    std::fs::write(
        homebrew.join("custom-feat.mdx"),
        "---\nid: custom:feat:test\n---\n",
    ).unwrap();

    let publish_path = tmp.path().join("published");
    let result = publish_campaign(&campaign_path, &publish_path, "1.0.0");
    assert!(result.is_ok());

    // Event log stripped
    assert!(!publish_path.join("event_log").exists());
    // State stripped
    assert!(!publish_path.join("state").exists());
    // Homebrew preserved
    assert!(publish_path.join("homebrew/entities/custom-feat.mdx").exists());
    // Manifest updated
    let manifest = std::fs::read_to_string(publish_path.join("manifest.yaml")).unwrap();
    assert!(manifest.contains("pack_type: source"));
    assert!(manifest.contains("version: \"1.0.0\""));
}
```

- [ ] **Step 2: Implement campaign publish**

```rust
/// Publish a campaign as an immutable source pack.
/// Strips event log and state, converts pack_type, freezes version.
pub fn publish_campaign(
    campaign_path: &Path,
    publish_path: &Path,
    version: &str,
) -> Result<(), String> {
    // Use export_campaign to strip event log and convert pack_type
    crate::pack_export::export_campaign(campaign_path, publish_path)?;

    // Also strip state directory
    let state_dir = publish_path.join("state");
    if state_dir.exists() {
        fs::remove_dir_all(&state_dir)
            .map_err(|e| format!("Failed to remove state dir: {e}"))?;
    }

    // Update version in manifest
    let manifest_path = publish_path.join("manifest.yaml");
    let content = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest: {e}"))?;
    let updated = content
        .lines()
        .map(|line| {
            if line.starts_with("version:") {
                format!("version: \"{}\"", version)
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n");
    fs::write(&manifest_path, format!("{}\n", updated))
        .map_err(|e| format!("Failed to write manifest: {e}"))?;

    Ok(())
}
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd src-tauri && cargo test test_publish_campaign -- --nocapture
```

Expected: PASS.

- [ ] **Step 4: Add IPC command**

```rust
#[tauri::command]
pub fn publish_campaign_pack(
    role: crate::permission::Role,
    campaign_path: String,
    publish_path: String,
    version: String,
) -> Result<(), String> {
    let guard = crate::permission::PermissionGuard::new(role);
    guard.check(crate::permission::Action::PublishCampaign)?;
    crate::campaign::publish_campaign(
        Path::new(&campaign_path),
        Path::new(&publish_path),
        &version,
    )
}
```

- [ ] **Step 5: Commit**

Run:
```bash
git add src-tauri/src/campaign.rs src-tauri/src/ipc.rs
git commit -m "feat: add campaign publish — strips event log, freezes version, converts to source pack"
```

---

### Task 6: Event log viewer React component

**Files:**
- Create: `src/components/EventLogViewer.tsx`
- Create: `src/components/EventLogViewer.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/components/EventLogViewer.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EventLogViewer } from "./EventLogViewer";

describe("EventLogViewer", () => {
  const events = [
    {
      id: "evt-001",
      timestamp: "2026-04-01T20:00:00Z",
      op: "set",
      path: "abilities.str.score",
      value: 18,
      source: "player:tom",
      event_type: "Normal",
    },
    {
      id: "evt-002",
      timestamp: "2026-04-01T20:15:00Z",
      op: "set",
      path: "inventory.gold",
      value: 8315,
      source: "dm:rule-of-cool",
      event_type: "RuleOfCool",
      note: "The merchant recognized the sigil",
    },
  ];

  it("renders event entries", () => {
    render(<EventLogViewer events={events} />);
    expect(screen.getByText("abilities.str.score")).toBeTruthy();
    expect(screen.getByText("inventory.gold")).toBeTruthy();
  });

  it("highlights Rule of Cool events", () => {
    render(<EventLogViewer events={events} />);
    const ruleOfCool = screen.getByText("The merchant recognized the sigil");
    expect(ruleOfCool).toBeTruthy();
  });

  it("shows empty state when no events", () => {
    render(<EventLogViewer events={[]} />);
    expect(screen.getByText(/no events/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/components/EventLogViewer.test.tsx
```

Expected: FAIL — component doesn't exist.

- [ ] **Step 3: Implement EventLogViewer**

```tsx
// src/components/EventLogViewer.tsx
interface GameEvent {
  id: string;
  timestamp: string;
  op: string;
  path: string;
  value: unknown;
  source: string;
  event_type: string;
  note?: string;
  previous_ops_referenced?: string[];
}

interface EventLogViewerProps {
  events: GameEvent[];
}

export function EventLogViewer({ events }: EventLogViewerProps) {
  if (events.length === 0) {
    return <p className="text-gray-400 italic">No events recorded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div
          key={event.id}
          className={`p-3 rounded border ${
            event.event_type === "RuleOfCool"
              ? "border-amber-500 bg-amber-900/20"
              : event.event_type === "Error"
                ? "border-red-500 bg-red-900/20"
                : "border-gray-700 bg-gray-800/50"
          }`}
        >
          <div className="flex justify-between text-sm">
            <span className="font-mono text-gray-300">{event.path}</span>
            <span className="text-gray-500">{event.timestamp}</span>
          </div>
          <div className="text-sm mt-1">
            <span className="text-gray-400">{event.op}</span>{" "}
            <span className="text-white font-mono">
              {JSON.stringify(event.value)}
            </span>{" "}
            <span className="text-gray-500">by {event.source}</span>
          </div>
          {event.note && (
            <p className="text-amber-300 text-sm mt-1 italic">{event.note}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run src/components/EventLogViewer.test.tsx
```

Expected: All 3 tests pass.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/components/EventLogViewer.tsx src/components/EventLogViewer.test.tsx
git commit -m "feat: add EventLogViewer component with Rule of Cool highlighting"
```

---

### Task 7: Phase 5 verification

- [ ] **Step 1: Run full test suite**

Run:
```bash
pnpm run test
cd src-tauri && cargo test
```

Expected: All tests pass.

- [ ] **Step 2: Verify campaign lifecycle end-to-end**

Create a campaign, add an override, append events, apply Rule of Cool, publish. Verify the published pack is valid and loadable.

- [ ] **Step 3: Tag Phase 5 complete**

Run:
```bash
git tag phase-5-complete
```
