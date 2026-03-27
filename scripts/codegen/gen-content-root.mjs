// scripts/codegen/gen-content-root.mjs
// Generates the root content.mdx index

import { join } from 'node:path'
import { writeMdx } from './lib/writer.mjs'

export function generateContentRoot(ROOT, counts) {
  const dir = join(ROOT, 'entities')
  const fm = {
    type: 'index',
    name: 'Content',
    tags: ['index'],
    generatedAt: new Date().toISOString(),
    counts,
  }

  let body = `## D&D 3.5 Gestalt Character Creator Content Pack\n\n`
  body += `- [Races](./races/races.mdx) — ${counts.races} races and templates\n`
  body += `- [Classes](./classes/classes.mdx) — ${counts.classes} classes (base, prestige, paragon)\n`
  body += `- [Feats](./feats/feats.mdx) — ${counts.feats} feats with prerequisite chains\n`
  body += `- [Spells](./spells/spells.mdx) — ${counts.spells} spells by school\n`

  writeMdx(dir, 'content', fm, body)
  console.log('  Root: content.mdx')
}
