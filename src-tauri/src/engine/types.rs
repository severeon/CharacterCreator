//! Shared types returned across engine commands.

/// Workflow progress snapshot returned to the UI.
#[derive(Debug, Clone, serde::Serialize)]
pub struct WorkflowStatus {
    pub completed: Vec<String>,
    pub pending: Vec<String>,
    pub available: Vec<String>,
}
