---
name: vite-verify-after-edit
enabled: true
event: file
pattern: \.(ts|tsx|js|jsx)$
path_filter: ^src/
action: warn
---

**Frontend file edited**

After editing TypeScript/JavaScript code, run verification:
```bash
npx tsc --noEmit && npx vitest run
```

This runs: TypeScript type checking and Vitest unit tests
