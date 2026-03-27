// scripts/codegen/gen-feats.mjs
// Generates feat .mdx files (flat structure with bidirectional links)

import { join } from 'node:path'
import { slugify } from './lib/slugger.mjs'
import { writeMdx } from './lib/writer.mjs'
import { inferFeatTags } from './lib/tags.mjs'
import { toArcanumFm } from './lib/arcanum.mjs'

export function generateFeats(data) {
  const { BASE_FEATS, FEAT_PREREQS, FEATS_STACKABLE, FEAT_CHOICES,
          featToBonusSources, featToUnlocks, ROOT } = data
  const dir = join(ROOT, 'entities', 'feats')
  let count = 0

  for (const featName of BASE_FEATS) {
    const slug = slugify(featName)
    const prereqs = FEAT_PREREQS[featName] || {}
    const bonusFeatFor = featToBonusSources[featName] || []
    const unlocks = featToUnlocks[featName] || []
    const choices = FEAT_CHOICES[featName] || null
    const stackable = FEATS_STACKABLE.has(featName)

    const tags = inferFeatTags(featName, prereqs, bonusFeatFor)

    const fields = {}
    if (Object.keys(prereqs).length) fields.prereqs = prereqs
    if (bonusFeatFor.length) fields.bonusFeatFor = bonusFeatFor
    if (unlocks.length) fields.unlocks = unlocks
    if (stackable) fields.stackable = true
    if (choices) fields.choices = choices
    const fm = toArcanumFm('feat', featName, fields, tags)

    const body = buildFeatBody(featName, prereqs, bonusFeatFor, unlocks, choices, stackable)
    writeMdx(dir, slug, fm, body)
    count++
  }

  // Feats index
  const chains = buildChains(BASE_FEATS, FEAT_PREREQS)
  const indexFm = {
    id: 'srd:feat:feats',
    entity_type: 'feat',
    type: 'index',
    name: 'Feats',
    tags: ['index'],
    count,
  }
  writeMdx(dir, 'feats', indexFm, buildFeatsIndexBody(BASE_FEATS, chains, FEAT_PREREQS))

  console.log(`  Feats: ${count} files`)
  return count
}

function buildFeatBody(name, prereqs, bonusFeatFor, unlocks, choices, stackable) {
  let body = `## ${name}\n\n`

  if (stackable) {
    body += `> *This feat can be taken multiple times.*\n\n`
  }

  // Prerequisites
  if (Object.keys(prereqs).length > 0) {
    body += `### Prerequisites\n\n`
    if (prereqs.bab) body += `- **Base Attack Bonus:** +${prereqs.bab}\n`
    if (prereqs.str) body += `- **STR:** ${prereqs.str}+\n`
    if (prereqs.dex) body += `- **DEX:** ${prereqs.dex}+\n`
    if (prereqs.con) body += `- **CON:** ${prereqs.con}+\n`
    if (prereqs.int) body += `- **INT:** ${prereqs.int}+\n`
    if (prereqs.wis) body += `- **WIS:** ${prereqs.wis}+\n`
    if (prereqs.cha) body += `- **CHA:** ${prereqs.cha}+\n`
    if (prereqs.feats) {
      for (const f of prereqs.feats) {
        body += `- [${f}](./${slugify(f)}.mdx)\n`
      }
    }
    if (prereqs.requiresSpellcasting) body += `- Able to cast spells\n`
    if (prereqs.requiresPsionic) body += `- Psionic ability\n`
    if (prereqs.casterLevel) body += `- **Caster Level:** ${prereqs.casterLevel}+\n`
    if (prereqs.minCharLevel) body += `- **Character Level:** ${prereqs.minCharLevel}+\n`
    if (prereqs.requiresClass) body += `- **Requires Class:** ${prereqs.requiresClass}\n`
    if (prereqs.minClassLevel) body += `- **Min Class Level:** ${prereqs.minClassLevel}\n`
    if (prereqs.special) body += `- *${prereqs.special}*\n`
    body += '\n'
  }

  // Feat chain (unlocks)
  if (unlocks.length > 0) {
    body += `### Unlocks\n\n`
    for (const u of unlocks) {
      body += `- [${u}](./${slugify(u)}.mdx)\n`
    }
    body += '\n'
  }

  // Bonus feat for
  if (bonusFeatFor.length > 0) {
    body += `### Available as Bonus Feat\n\n`
    for (const cls of bonusFeatFor) {
      body += `- ${cls}\n`
    }
    body += '\n'
  }

  // Choices
  if (choices) {
    body += `### Selection Required\n\n`
    body += `**${choices.prompt}**\n\n`
    if (Array.isArray(choices.options)) {
      for (const opt of choices.options) {
        body += `- ${opt}\n`
      }
    } else {
      body += `*(open choice)*\n`
    }
    body += '\n'
  }

  body += `\n---\n\n[Back to Feats](./feats.mdx)\n`
  return body
}

function buildChains(BASE_FEATS, FEAT_PREREQS) {
  // Find root feats (not required by anything, or only self-referencing chains)
  const chains = {}
  for (const featName of BASE_FEATS) {
    const prereqs = FEAT_PREREQS[featName] || {}
    const reqFeats = prereqs.feats || []
    // Simple chain detection: group by first prerequisite
    if (reqFeats.length > 0) {
      const root = reqFeats[0]
      if (!chains[root]) chains[root] = [root]
      if (!chains[root].includes(featName)) chains[root].push(featName)
    }
  }
  return chains
}

function buildFeatsIndexBody(BASE_FEATS, chains, FEAT_PREREQS) {
  let body = `## All Feats\n\n`
  body += `| Feat | Prerequisites |\n`
  body += `|------|---------------|\n`
  for (const f of BASE_FEATS) {
    const slug = slugify(f)
    const prereqs = (FEAT_PREREQS[f] || {}).feats || []
    const reqStr = prereqs.length ? prereqs.join(', ') : '—'
    body += `| [${f}](./${slug}.mdx) | ${reqStr} |\n`
  }
  return body
}
