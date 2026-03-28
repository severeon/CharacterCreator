//! Typed error enum for the Arcanum engine.

#[derive(Debug)]
pub enum EngineError {
    EntityNotFound { entity_type: String, id: String },
    ValidationError(String),
    SerializationError(String),
}

impl std::fmt::Display for EngineError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EngineError::EntityNotFound { entity_type, id } => {
                write!(f, "{} not found: {}", entity_type, id)
            }
            EngineError::ValidationError(msg) => write!(f, "{}", msg),
            EngineError::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
        }
    }
}

impl From<EngineError> for String {
    fn from(err: EngineError) -> String {
        err.to_string()
    }
}
