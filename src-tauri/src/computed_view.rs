use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::entity::{Entity, Value};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Computation {
    Floor(Box<Computation>),
    Ceil(Box<Computation>),
    Div(Box<Computation>, Box<Computation>),
    Sub(Box<Computation>, Box<Computation>),
    Add(Box<Computation>, Box<Computation>),
    Mul(Box<Computation>, Box<Computation>),
    Min(Vec<Computation>),
    Max(Vec<Computation>),
    ReadPath(String),
    Literal(Value),
}

impl Computation {
    pub fn evaluate(&self, entity: &Entity) -> Option<Value> {
        match self {
            Computation::Literal(v) => Some(v.clone()),
            Computation::ReadPath(path) => entity.get_property(path).cloned(),
            Computation::Floor(comp) => comp.evaluate(entity),
            Computation::Ceil(comp) => comp.evaluate(entity),
            Computation::Div(left, right) => {
                match (left.evaluate(entity), right.evaluate(entity)) {
                    (Some(Value::Int(a)), Some(Value::Int(b))) if b != 0 => {
                        Some(Value::Int(a / b))
                    }
                    _ => None,
                }
            }
            Computation::Sub(left, right) => {
                match (left.evaluate(entity), right.evaluate(entity)) {
                    (Some(Value::Int(a)), Some(Value::Int(b))) => Some(Value::Int(a - b)),
                    _ => None,
                }
            }
            Computation::Add(left, right) => {
                match (left.evaluate(entity), right.evaluate(entity)) {
                    (Some(Value::Int(a)), Some(Value::Int(b))) => Some(Value::Int(a + b)),
                    _ => None,
                }
            }
            Computation::Mul(left, right) => {
                match (left.evaluate(entity), right.evaluate(entity)) {
                    (Some(Value::Int(a)), Some(Value::Int(b))) => Some(Value::Int(a * b)),
                    _ => None,
                }
            }
            Computation::Min(comps) => {
                let vals: Vec<i64> = comps
                    .iter()
                    .filter_map(|c| c.evaluate(entity)?.as_int())
                    .collect();
                vals.into_iter().min().map(Value::Int)
            }
            Computation::Max(comps) => {
                let vals: Vec<i64> = comps
                    .iter()
                    .filter_map(|c| c.evaluate(entity)?.as_int())
                    .collect();
                vals.into_iter().max().map(Value::Int)
            }
        }
    }

    pub fn read_path(path: &str) -> Self {
        Computation::ReadPath(path.to_string())
    }

    pub fn literal(value: Value) -> Self {
        Computation::Literal(value)
    }

    pub fn add(left: Computation, right: Computation) -> Self {
        Computation::Add(Box::new(left), Box::new(right))
    }

    pub fn sub(left: Computation, right: Computation) -> Self {
        Computation::Sub(Box::new(left), Box::new(right))
    }

    pub fn mul(left: Computation, right: Computation) -> Self {
        Computation::Mul(Box::new(left), Box::new(right))
    }

    pub fn div(left: Computation, right: Computation) -> Self {
        Computation::Div(Box::new(left), Box::new(right))
    }

    pub fn floor(comp: Computation) -> Self {
        Computation::Floor(Box::new(comp))
    }

    pub fn min(comps: Vec<Computation>) -> Self {
        Computation::Min(comps)
    }

    pub fn max(comps: Vec<Computation>) -> Self {
        Computation::Max(comps)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComputedView {
    pub id: Uuid,
    pub target: String,
    pub path: String,
    pub inputs: Vec<String>,
    pub computation: Computation,
    pub source: String,
    #[serde(default = "default_version")]
    pub version: u64,
}

fn default_version() -> u64 {
    1
}

impl ComputedView {
    pub fn new(
        target: &str,
        path: &str,
        inputs: Vec<String>,
        computation: Computation,
        source: &str,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            target: target.to_string(),
            path: path.to_string(),
            inputs,
            computation,
            source: source.to_string(),
            version: 1,
        }
    }

    pub fn with_version(mut self, version: u64) -> Self {
        self.version = version;
        self
    }

    pub fn ability_modifier(score_path: &str, target: &str) -> Self {
        let comp = Computation::floor(Computation::div(
            Computation::sub(
                Computation::read_path(score_path),
                Computation::literal(Value::Int(10)),
            ),
            Computation::literal(Value::Int(2)),
        ));
        let modifier_path = score_path.trim_end_matches(".score");
        Self::new(
            target,
            &format!("{}.modifier", modifier_path),
            vec![score_path.to_string()],
            comp,
            "srd:rules:ability_modifiers",
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_computation_ability_modifier() {
        let comp = Computation::floor(Computation::div(
            Computation::sub(
                Computation::read_path("abilities.strength.score"),
                Computation::literal(Value::Int(10)),
            ),
            Computation::literal(Value::Int(2)),
        ));
        assert!(matches!(comp, Computation::Floor(_)));
    }

    #[test]
    fn test_computed_view_new() {
        let view = ComputedView::new(
            "character-123",
            "abilities.strength.modifier",
            vec!["abilities.strength.score".to_string()],
            Computation::floor(Computation::div(
                Computation::sub(
                    Computation::read_path("abilities.strength.score"),
                    Computation::literal(Value::Int(10)),
                ),
                Computation::literal(Value::Int(2)),
            )),
            "srd:rules",
        );
        assert_eq!(view.target, "character-123");
        assert_eq!(view.inputs.len(), 1);
    }

    #[test]
    fn test_computed_view_ability_modifier_helper() {
        let view = ComputedView::ability_modifier("abilities.strength.score", "character-123");
        assert_eq!(view.path, "abilities.strength.modifier");
        assert_eq!(view.inputs[0], "abilities.strength.score");
    }
}
