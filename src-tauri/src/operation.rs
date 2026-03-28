use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum StackRule {
    Additive,
    HighestWins,
    LowestWins,
    Exclusive,
    Named(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum OpCode {
    Set,
    Add,
    Sub,
    Multiply,
    Grant,
    Revoke,
    Push,
    Pop,
    Clear,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Operation {
    pub op: OpCode,
    pub target: String,
    pub path: String,
    pub value: crate::entity::Value,
    #[serde(default)]
    pub stack_rule: Option<StackRule>,
    pub source: String,
}

impl Operation {
    pub fn new(
        op: OpCode,
        target: &str,
        path: &str,
        value: crate::entity::Value,
        source: &str,
    ) -> Self {
        Self {
            op,
            target: target.to_string(),
            path: path.to_string(),
            value,
            stack_rule: None,
            source: source.to_string(),
        }
    }

    pub fn with_stack_rule(mut self, rule: StackRule) -> Self {
        self.stack_rule = Some(rule);
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_opcode_serde() {
        let json = serde_json::to_string(&OpCode::Add).unwrap();
        assert_eq!(json, "\"Add\"");
    }

    #[test]
    fn test_stack_rule_named() {
        let rule = StackRule::Named("enhancement".to_string());
        let json = serde_json::to_string(&rule).unwrap();
        assert!(json.contains("enhancement"));
    }

    #[test]
    fn test_operation_new() {
        let op = Operation::new(
            OpCode::Add,
            "character-123",
            "abilities.strength.modifier",
            crate::entity::Value::Int(3),
            "test.source",
        );
        assert_eq!(op.op, OpCode::Add);
        assert_eq!(op.target, "character-123");
        assert_eq!(op.path, "abilities.strength.modifier");
        assert!(op.stack_rule.is_none());
    }

    #[test]
    fn test_operation_with_stack_rule() {
        let op = Operation::new(
            OpCode::Add,
            "character-123",
            "attack.bonus",
            crate::entity::Value::Int(2),
            "test.source",
        )
        .with_stack_rule(StackRule::Additive);
        assert!(op.stack_rule.is_some());
    }
}
