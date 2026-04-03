---
name: eslint-on-save
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.(js|ts|jsx|tsx)$
---

A JS/TS file was just edited. Run ESLint before continuing:

```
eslint --cache -c eslint.config.mjs src/
```

Fix any errors it reports before proceeding.
