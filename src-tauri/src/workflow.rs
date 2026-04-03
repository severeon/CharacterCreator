use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::entity::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStep {
    pub id: String,
    pub required: bool,
    pub command: String,
    #[serde(default)]
    pub depends_on: Vec<String>,
    #[serde(default)]
    pub unlocks: Vec<String>,
    #[serde(default)]
    pub repeatable: bool,
    #[serde(default)]
    pub complete_when: Option<CompleteCondition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompleteCondition {
    pub eq: Option<(String, serde_json::Value)>,
    pub gt: Option<(String, serde_json::Value)>,
    pub lt: Option<(String, serde_json::Value)>,
    #[serde(default)]
    pub in_changeset: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: String,
    pub entity_type: String,
    pub steps: Vec<WorkflowStep>,
}

#[allow(dead_code)]
impl Workflow {
    pub fn new(id: &str) -> Self {
        Self {
            id: id.to_string(),
            entity_type: "workflow".to_string(),
            steps: Vec::new(),
        }
    }

    pub fn add_step(mut self, step: WorkflowStep) -> Self {
        self.steps.push(step);
        self
    }

    pub fn get_step(&self, step_id: &str) -> Option<&WorkflowStep> {
        self.steps.iter().find(|s| s.id == step_id)
    }

    pub fn get_available_steps(&self, completed: &[String]) -> Vec<&WorkflowStep> {
        self.steps
            .iter()
            .filter(|step| {
                if completed.contains(&step.id) && !step.repeatable {
                    return false;
                }
                step.depends_on.iter().all(|dep| completed.contains(dep))
            })
            .collect()
    }
}

pub struct WorkflowEngine {
    workflows: std::collections::HashMap<String, Workflow>,
}

#[allow(dead_code)]
impl WorkflowEngine {
    pub fn new() -> Self {
        Self {
            workflows: std::collections::HashMap::new(),
        }
    }

    pub fn register(&mut self, workflow: Workflow) {
        self.workflows.insert(workflow.id.clone(), workflow);
    }

    pub fn get_workflow(&self, id: &str) -> Option<&Workflow> {
        self.workflows.get(id)
    }

    pub fn get_next_steps(
        &self,
        workflow_id: &str,
        completed: &[String],
        _entity_state: &crate::entity::Entity,
    ) -> Vec<String> {
        if let Some(workflow) = self.workflows.get(workflow_id) {
            workflow
                .get_available_steps(completed)
                .iter()
                .map(|s| s.id.clone())
                .collect()
        } else {
            Vec::new()
        }
    }

    pub fn is_step_complete(
        &self,
        workflow_id: &str,
        step_id: &str,
        entity_state: &crate::entity::Entity,
    ) -> bool {
        let workflow = match self.workflows.get(workflow_id) {
            Some(w) => w,
            None => return false,
        };

        let step = match workflow.get_step(step_id) {
            Some(s) => s,
            None => return false,
        };

        // If step has no complete_when, use property-based fallback
        let condition = match &step.complete_when {
            Some(c) => c,
            None => {
                return match step.command.as_str() {
                    "select_race" => entity_state.get_property("race").is_some(),
                    "select_class" => entity_state.get_property("class").is_some(),
                    "assign_ability_scores" => {
                        entity_state.get_property("abilities.strength.score").is_some()
                    }
                    "allocate_skill_points" => {
                        entity_state.get_property("skill_points_allocated").is_some()
                    }
                    "select_feat" => entity_state.get_property("feats_selected").is_some(),
                    _ => true,
                };
            }
        };

        // Evaluate complete_when conditions
        if let Some((path, _expected)) = &condition.eq {
            let actual = entity_state.get_property(path);
            return actual.is_some();
        }

        if let Some((path, min_val)) = &condition.gt {
            if let Some(Value::Int(v)) = entity_state.get_property(path) {
                if let Some(expected_int) = min_val.as_i64() {
                    return v.cmp(&expected_int) == std::cmp::Ordering::Greater;
                }
            }
            return false;
        }

        if let Some((path, max_val)) = &condition.lt {
            if let Some(Value::Int(v)) = entity_state.get_property(path) {
                if let Some(expected_int) = max_val.as_i64() {
                    return v.cmp(&expected_int) == std::cmp::Ordering::Less;
                }
            }
            return false;
        }

        if let Some(path) = &condition.in_changeset {
            return entity_state.get_property(path).is_some();
        }

        true
    }
}

impl Default for WorkflowEngine {
    fn default() -> Self {
        Self::new()
    }
}

pub fn create_character_creation_workflow() -> Workflow {
    Workflow::new("srd:workflow:character_creation")
        .add_step(WorkflowStep {
            id: "select-race".to_string(),
            required: true,
            command: "select_race".to_string(),
            depends_on: vec![],
            unlocks: vec![
                "select-class".to_string(),
                "assign-ability-scores".to_string(),
            ],
            repeatable: false,
            complete_when: None,
        })
        .add_step(WorkflowStep {
            id: "select-class".to_string(),
            required: true,
            command: "select_class".to_string(),
            depends_on: vec!["select-race".to_string()],
            unlocks: vec!["allocate-skills".to_string(), "select-feats".to_string()],
            repeatable: false,
            complete_when: None,
        })
        .add_step(WorkflowStep {
            id: "assign-ability-scores".to_string(),
            required: true,
            command: "assign_ability_scores".to_string(),
            depends_on: vec!["select-race".to_string()],
            unlocks: vec![],
            repeatable: false,
            complete_when: None,
        })
        .add_step(WorkflowStep {
            id: "allocate-skills".to_string(),
            required: true,
            command: "allocate_skill_points".to_string(),
            depends_on: vec![
                "select-class".to_string(),
                "assign-ability-scores".to_string(),
            ],
            unlocks: vec![],
            repeatable: false,
            complete_when: None,
        })
        .add_step(WorkflowStep {
            id: "select-feats".to_string(),
            required: true,
            command: "select_feat".to_string(),
            depends_on: vec!["select-class".to_string()],
            unlocks: vec![],
            repeatable: true,
            complete_when: None,
        })
}

#[allow(dead_code)]
fn make_entity(id: &str, properties: HashMap<String, Value>) -> crate::entity::Entity {
    crate::entity::Entity {
        id: id.to_string(),
        entity_type: "character".to_string(),
        properties,
        tags: vec![],
        mdx_body: String::new(),
        source_pack: String::new(),
        subscriptions: vec![],
        computed_views: vec![],
        prototype: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_workflow_creation() {
        let workflow = create_character_creation_workflow();
        assert_eq!(workflow.id, "srd:workflow:character_creation");
        assert_eq!(workflow.steps.len(), 5);
    }

    #[test]
    fn test_workflow_get_available_steps() {
        let workflow = create_character_creation_workflow();
        let completed: Vec<String> = vec![];

        let available = workflow.get_available_steps(&completed);
        assert_eq!(available.len(), 1);
        assert_eq!(available[0].id, "select-race");
    }

    #[test]
    fn test_workflow_step_dependencies() {
        let workflow = create_character_creation_workflow();
        let completed = vec!["select-race".to_string()];

        let available = workflow.get_available_steps(&completed);
        let ids: Vec<&str> = available.iter().map(|s| s.id.as_str()).collect();
        assert!(ids.contains(&"select-class"));
        assert!(ids.contains(&"assign-ability-scores"));
    }

    #[test]
    fn test_is_step_complete_with_eq_condition() {
        let mut workflow_engine = WorkflowEngine::new();
        workflow_engine.register(create_character_creation_workflow());

        let mut entity = make_entity("char1", HashMap::new());
        entity.set_property("race", Value::Str("human".to_string()));

        // Race is set so select-race step should be complete
        let complete = workflow_engine.is_step_complete(
            "srd:workflow:character_creation",
            "select-race",
            &entity,
        );
        assert!(complete);
    }

    #[test]
    fn test_is_step_complete_unset_property() {
        let mut workflow_engine = WorkflowEngine::new();
        workflow_engine.register(create_character_creation_workflow());

        let entity = make_entity("char1", HashMap::new());

        // Race is NOT set so select-race step should NOT be complete
        let complete = workflow_engine.is_step_complete(
            "srd:workflow:character_creation",
            "select-race",
            &entity,
        );
        assert!(!complete);
    }
}
