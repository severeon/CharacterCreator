use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::entity::Value;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Predicate {
    Eq(String, Value),
    Gt(String, Value),
    Lt(String, Value),
    Gte(String, Value),
    Lte(String, Value),
    In(String, Vec<Value>),
    Has(String),
    Not(Box<Predicate>),
    And(Vec<Predicate>),
    Or(Vec<Predicate>),
    EntityHas(String, String),
    InChangeset(String),
    PayloadEq(String, Value),
}

impl Predicate {
    pub fn and(predicates: Vec<Predicate>) -> Self {
        Predicate::And(predicates)
    }

    pub fn or(predicates: Vec<Predicate>) -> Self {
        Predicate::Or(predicates)
    }

    pub fn not(predicate: Predicate) -> Self {
        Predicate::Not(Box::new(predicate))
    }

    pub fn eq(path: &str, value: Value) -> Self {
        Predicate::Eq(path.to_string(), value)
    }

    pub fn gt(path: &str, value: Value) -> Self {
        Predicate::Gt(path.to_string(), value)
    }

    pub fn gte(path: &str, value: Value) -> Self {
        Predicate::Gte(path.to_string(), value)
    }

    pub fn lt(path: &str, value: Value) -> Self {
        Predicate::Lt(path.to_string(), value)
    }

    pub fn lte(path: &str, value: Value) -> Self {
        Predicate::Lte(path.to_string(), value)
    }

    pub fn has(path: &str) -> Self {
        Predicate::Has(path.to_string())
    }

    pub fn in_values(path: &str, values: Vec<Value>) -> Self {
        Predicate::In(path.to_string(), values)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subscription {
    #[serde(default)]
    pub id: Uuid,
    pub trigger: String,
    #[serde(default)]
    pub predicate: Option<Predicate>,
    pub effects: Vec<crate::operation::Operation>,
    #[serde(default = "default_priority")]
    pub priority: i32,
    pub source: String,
}

fn default_priority() -> i32 {
    50
}

impl Subscription {
    pub fn new(trigger: &str, effects: Vec<super::operation::Operation>, source: &str) -> Self {
        Self {
            id: Uuid::new_v4(),
            trigger: trigger.to_string(),
            predicate: None,
            effects,
            priority: 50,
            source: source.to_string(),
        }
    }

    pub fn with_predicate(mut self, predicate: Predicate) -> Self {
        self.predicate = Some(predicate);
        self
    }

    pub fn with_priority(mut self, priority: i32) -> Self {
        self.priority = priority;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_predicate_eq() {
        let pred = Predicate::eq("abilities.strength.score", Value::Int(16));
        assert!(matches!(pred, Predicate::Eq(_, _)));
    }

    #[test]
    fn test_predicate_and() {
        let pred = Predicate::and(vec![
            Predicate::gt("bab", Value::Int(0)),
            Predicate::has("abilities.strength.score"),
        ]);
        assert!(matches!(pred, Predicate::And(_)));
    }

    #[test]
    fn test_predicate_or() {
        let pred = Predicate::or(vec![
            Predicate::eq("race", Value::Str("human".to_string())),
            Predicate::eq("race", Value::Str("elf".to_string())),
        ]);
        assert!(matches!(pred, Predicate::Or(_)));
    }

    #[test]
    fn test_subscription_new() {
        let op = crate::operation::Operation::new(
            crate::operation::OpCode::Add,
            "target",
            "path",
            Value::Int(1),
            "source",
        );
        let sub = Subscription::new("event.trigger", vec![op], "test.source");
        assert_eq!(sub.trigger, "event.trigger");
        assert_eq!(sub.effects.len(), 1);
        assert!(sub.predicate.is_none());
    }

    #[test]
    fn test_subscription_with_predicate() {
        let op = crate::operation::Operation::new(
            crate::operation::OpCode::Grant,
            "target",
            "feat_slots.bonus.count",
            Value::Int(1),
            "source",
        );
        let sub = Subscription::new("race.selected", vec![op], "srd:race:human")
            .with_predicate(Predicate::eq(
                "event.payload.race_id",
                Value::Str("human".to_string()),
            ))
            .with_priority(100);
        assert!(sub.predicate.is_some());
        assert_eq!(sub.priority, 100);
    }
}
