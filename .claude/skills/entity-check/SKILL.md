---
name: entity-check
description: Spot-check a single MDX entity file for SRD accuracy
disable-model-invocation: true
---

Usage: /entity-check <entity-type>/<entity-id>

Read the entity at `content/packs/srd-3.5e/entities/<entity-type>/<entity-id>.mdx` and:
1. Extract the frontmatter fields
2. List any properties that look suspicious or incomplete
3. Flag missing required fields based on entity type conventions