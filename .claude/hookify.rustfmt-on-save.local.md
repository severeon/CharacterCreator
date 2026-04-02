---
name: rustfmt-on-save
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.rs$
action: warn
---

**Rust file edited — run rustfmt**

Format the file you just edited:
```bash
cd src-tauri && rustfmt --edition 2021 <file_path>
```

Replace `<file_path>` with the actual path of the edited file.
