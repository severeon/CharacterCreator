---
name: verify-all
description: Run all frontend and backend verification checks (tests, types, lint) in parallel
---

# Verify All

Run the full verification suite for both frontend and backend. Execute all commands in parallel using multiple Bash tool calls in a single message.

## Frontend (run in parallel)
1. `npx vitest run` — unit tests
2. `npx tsc --noEmit` — type checking

## Backend (run in parallel)
3. `cd src-tauri && cargo test` — Rust tests
4. `cd src-tauri && cargo clippy -- -D warnings` — Rust lints

## After all complete
Report a summary table:

| Check | Result |
|-------|--------|
| vitest | pass/fail |
| tsc | pass/fail |
| cargo test | pass/fail |
| cargo clippy | pass/fail |

If any check fails, show the relevant error output.
