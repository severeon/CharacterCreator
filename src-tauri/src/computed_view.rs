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

#[allow(dead_code)]
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

#[allow(dead_code)]
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

#[allow(dead_code)]
/// Sort computed views topologically by their input dependencies.
/// Returns views in evaluation order (dependencies first).
/// Returns Err with cycle description if views have circular dependencies.
pub fn sort_computed_views(views: &[ComputedView]) -> Result<Vec<ComputedView>, String> {
    // Build adjacency: view index -> indices of views that depend on it
    let n = views.len();
    let mut in_degree: Vec<usize> = vec![0; n];
    let mut dependents: std::collections::HashMap<usize, Vec<usize>> = std::collections::HashMap::new();

    // For each view, find which other views it depends on
    for (i, view) in views.iter().enumerate() {
        for (j, other) in views.iter().enumerate() {
            if i == j {
                continue;
            }
            // If view.inputs contains other's path, view depends on other
            if view.inputs.iter().any(|input| other.path == *input) {
                // view depends on other (j)
                in_degree[i] += 1;
                dependents.entry(j).or_default().push(i);
            }
        }
    }

    // Kahn's algorithm
    let mut queue: Vec<usize> = in_degree
        .iter()
        .enumerate()
        .filter(|(_, &deg)| deg == 0)
        .map(|(i, _)| i)
        .collect();
    let mut sorted = Vec::new();

    while let Some(idx) = queue.pop() {
        sorted.push(idx);
        if let Some(deps) = dependents.get(&idx) {
            for &dep in deps {
                in_degree[dep] -= 1;
                if in_degree[dep] == 0 {
                    queue.push(dep);
                }
            }
        }
    }

    if sorted.len() != n {
        Err("Cycle detected in computed view dependencies".to_string())
    } else {
        Ok(sorted.iter().map(|&i| views[i].clone()).collect())
    }
}

#[cfg(test)]
mod dependency_tests {
    use super::*;

    #[test]
    fn test_topo_sort_no_deps() {
        let views = vec![
            ComputedView::new(
                "c1",
                "a",
                vec![],
                Computation::literal(Value::Int(1)),
                "src",
            ),
            ComputedView::new(
                "c2",
                "b",
                vec![],
                Computation::literal(Value::Int(2)),
                "src",
            ),
        ];
        let result = sort_computed_views(&views).unwrap();
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_topo_sort_with_deps() {
        // view_a depends on nothing, view_b depends on view_a's path
        let views = vec![
            ComputedView::new(
                "c1",
                "base",
                vec![],
                Computation::literal(Value::Int(1)),
                "src",
            ),
            ComputedView::new(
                "c2",
                "derived",
                vec!["base".to_string()],
                Computation::literal(Value::Int(2)),
                "src",
            ),
        ];
        let result = sort_computed_views(&views).unwrap();
        // base should come before derived
        let base_idx = result.iter().position(|v| v.path == "base").unwrap();
        let derived_idx = result.iter().position(|v| v.path == "derived").unwrap();
        assert!(base_idx < derived_idx);
    }

    #[test]
    fn test_cycle_detection() {
        // A depends on B, B depends on A — cycle
        let views = vec![
            ComputedView::new(
                "c1",
                "a",
                vec!["b".to_string()],
                Computation::literal(Value::Int(1)),
                "src",
            ),
            ComputedView::new(
                "c2",
                "b",
                vec!["a".to_string()],
                Computation::literal(Value::Int(2)),
                "src",
            ),
        ];
        let result = sort_computed_views(&views);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Cycle"));
    }
}
