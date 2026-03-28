//! Arcanum Engine — event dispatch and subscription system.
//!
//! Split into modules under 200 LOC each:
//! - `dispatcher.rs` — Dispatcher struct, indexing, main dispatch loop
//! - `predicate.rs`  — Predicate evaluation and value resolution
//! - `stack.rs`      — Stack-rule operation application
//! - `tests.rs`      — Unit tests

pub mod dispatcher;
pub mod predicate;
pub mod stack;
pub mod tests;

pub use dispatcher::Dispatcher;
