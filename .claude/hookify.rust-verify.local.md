---
name: rust-verify-after-edit
enabled: true
event: file
pattern: \.rs$
action: warn
---

**Rust file edited**

After editing Rust code, run verification:
```bash
cargo check && cargo test
```

This runs: `cargo check` (type checking) and `cargo test` (tests)
