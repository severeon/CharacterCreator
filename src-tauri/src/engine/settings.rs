//! DM configuration settings.

use serde::{Deserialize, Serialize};

/// DM-configurable settings for character creation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DMSettings {
    pub ability_method: String,
    pub max_ability_score: i32,
    pub gestalt_required: bool,
    pub no_templates: bool,
    pub max_ecl: i32,
    pub no_racial_hd: bool,
    pub enforce_prerequisites: bool,
    pub notes: String,
    pub restricted_entities: Vec<String>,
    pub rule_cool: bool,
}

pub type DmSettings = DMSettings;

impl Default for DMSettings {
    fn default() -> Self {
        Self {
            ability_method: "pointbuy".to_string(),
            max_ability_score: 18,
            gestalt_required: false,
            no_templates: false,
            max_ecl: 20,
            no_racial_hd: false,
            enforce_prerequisites: false,
            notes: String::new(),
            restricted_entities: vec![],
            rule_cool: false,
        }
    }
}
