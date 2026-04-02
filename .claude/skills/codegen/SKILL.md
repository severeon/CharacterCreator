---
name: codegen
description: Regenerate SRD 3.5e MDX entity files from legacy JS data sources
disable-model-invocation: true
---

Run the content codegen pipeline:

```bash
node scripts/codegen/run.mjs
```

Then report:
- How many files were written per entity type
- Any errors or warnings from the output
- git diff --stat content/packs/ to show what changed