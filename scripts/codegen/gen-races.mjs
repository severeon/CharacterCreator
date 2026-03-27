// scripts/codegen/gen-races.mjs
// Generates race .mdx files grouped by category

import { join } from 'node:path'
import { slugify } from './lib/slugger.mjs'
import { writeMdx } from './lib/writer.mjs'
import { inferRaceTags, inferTemplateTags, inferSourceTag } from './lib/tags.mjs'
import { toArcanumFm } from './lib/arcanum.mjs'

export function generateRaces(data) {
  const { RACES, TEMPLATES, RACE_PHYSICAL, RACE_PROFICIENCIES, catToRaceSlugs, ROOT } = data
  const baseDir = join(ROOT, 'entities', 'races')

  // Group races by category
  const byCat = {}
  for (const race of RACES) {
    if (!byCat[race.cat]) byCat[race.cat] = []
    byCat[race.cat].push(race)
  }

  let count = 0

  for (const [cat, races] of Object.entries(byCat)) {
    const catSlug = slugify(cat)
    const useDir = races.length > 1
    const dir = useDir ? join(baseDir, catSlug) : baseDir

    // If grouped, create category index
    if (useDir) {
      const indexFm = {
        type: 'index',
        name: cat,
        tags: ['index', 'race-category'],
        raceCount: races.length,
        races: races.map(r => ({ name: r.name, slug: slugify(r.name), la: r.la })),
      }
      const indexBody = buildRaceIndexBody(cat, races)
      writeMdx(dir, catSlug, indexFm, indexBody)
    }

    // Write each race
    for (const race of races) {
      const slug = slugify(race.name)
      const tags = inferRaceTags(race)
      const physical = RACE_PHYSICAL[race.name] || null
      const profs = RACE_PROFICIENCIES[race.name] || []

      const fields = {
        category: race.cat,
        la: race.la,
        rhd: race.rhd,
        rhdType: race.rhdType,
        bonuses: race.bonuses,
        traits: race.traits,
      }
      if (physical) fields.physical = physical
      if (profs.length) fields.proficiencies = profs
      const fm = toArcanumFm('race', race.name, fields, tags)

      const body = buildRaceBody(race, physical, profs, useDir ? catSlug : null)
      writeMdx(dir, slug, fm, body)
      count++
    }
  }

  // Templates
  const tplDir = join(baseDir, 'template')
  for (const tpl of TEMPLATES) {
    if (tpl.name === 'None') continue
    const slug = `template-${slugify(tpl.name)}`
    const tags = inferTemplateTags(tpl)

    const fields = {
      subtype: 'template',
      category: 'Templates',
      la: tpl.la,
      bonuses: tpl.bonuses,
      traits: tpl.traits,
      features: tpl.features,
    }
    const fm = toArcanumFm('race', tpl.name, fields, tags)

    const body = buildTemplateBody(tpl)
    writeMdx(tplDir, slug, fm, body)
    count++
  }

  // Races index
  const racesIndexFm = {
    type: 'index',
    name: 'Races',
    tags: ['index'],
    categories: Object.entries(byCat).map(([cat, r]) => ({
      name: cat,
      slug: slugify(cat),
      count: r.length,
    })),
    templateCount: TEMPLATES.filter(t => t.name !== 'None').length,
  }
  writeMdx(baseDir, 'races', racesIndexFm, buildRacesIndexBody(byCat))

  console.log(`  Races: ${count} files`)
  return count
}

function buildRaceBody(race, physical, profs, parentSlug) {
  let body = ''

  body += `## ${race.name}\n\n`
  body += `**Category:** ${race.cat}  \n`
  body += `**Level Adjustment:** ${race.la >= 0 ? '+' : ''}${race.la}  \n`
  if (race.rhd > 0) body += `**Racial Hit Dice:** ${race.rhd}d${race.rhdType}  \n`

  if (physical) {
    body += `**Size:** ${physical.size}  \n`
    body += `**Age:** ${physical.age[0]}–${physical.age[3]} years (mature ${physical.age[0]}, middle ${physical.age[1]}, old ${physical.age[2]}, venerable ${physical.age[3]})  \n`
  }

  if (race.bonuses && Object.keys(race.bonuses).length > 0) {
    body += `\n### Ability Score Adjustments\n\n`
    for (const [stat, mod] of Object.entries(race.bonuses)) {
      body += `- **${stat.toUpperCase()}:** ${mod >= 0 ? '+' : ''}${mod}\n`
    }
  }

  body += `\n### Racial Traits\n\n`
  for (const trait of race.traits) {
    body += `- ${trait}\n`
  }

  if (profs.length) {
    body += `\n### Proficiencies\n\n`
    for (const p of profs) {
      body += `- ${p}\n`
    }
  }

  body += `\n---\n\n`
  if (parentSlug) {
    body += `[Back to ${race.cat}](./${parentSlug}.mdx)\n`
  } else {
    body += `[Back to Races](./races.mdx)\n`
  }

  return body
}

function buildTemplateBody(tpl) {
  let body = `## ${tpl.name}\n\n`
  body += `**Level Adjustment:** ${tpl.la >= 0 ? '+' : ''}${tpl.la}  \n`

  if (tpl.bonuses && Object.keys(tpl.bonuses).length > 0) {
    body += `\n### Ability Score Adjustments\n\n`
    for (const [stat, mod] of Object.entries(tpl.bonuses)) {
      body += `- **${stat.toUpperCase()}:** ${mod >= 0 ? '+' : ''}${mod}\n`
    }
  }

  body += `\n### Traits\n\n`
  for (const t of tpl.traits) {
    body += `- ${t}\n`
  }

  if (tpl.features && tpl.features.length > 0) {
    body += `\n### Features\n\n`
    for (const f of tpl.features) {
      body += `- ${f}\n`
    }
  }

  body += `\n---\n\n[Back to Races](../races.mdx)\n`
  return body
}

function buildRaceIndexBody(cat, races) {
  let body = `## ${cat}\n\n`
  body += `| Race | LA | RHD | Ability Adjustments |\n`
  body += `|------|----|----|--------------------|\n`
  for (const r of races) {
    const slug = slugify(r.name)
    const mods = Object.entries(r.bonuses || {}).map(([k, v]) => `${k}${v >= 0 ? '+' : ''}${v}`).join(', ') || '—'
    body += `| [${r.name}](./${slug}.mdx) | ${r.la >= 0 ? '+' : ''}${r.la} | ${r.rhd > 0 ? `${r.rhd}d${r.rhdType}` : '—'} | ${mods} |\n`
  }
  return body
}

function buildRacesIndexBody(byCat) {
  let body = `## All Races\n\n`
  for (const [cat, races] of Object.entries(byCat)) {
    const catSlug = slugify(cat)
    if (races.length > 1) {
      body += `### [${cat}](./${catSlug}/${catSlug}.mdx)\n\n`
    } else {
      body += `### ${cat}\n\n`
    }
    for (const r of races) {
      const slug = slugify(r.name)
      const dir = races.length > 1 ? `./${catSlug}/` : './'
      body += `- [${r.name}](${dir}${slug}.mdx) (LA ${r.la >= 0 ? '+' : ''}${r.la})\n`
    }
    body += '\n'
  }
  body += `### [Templates](./template/template.mdx)\n\n`
  return body
}
