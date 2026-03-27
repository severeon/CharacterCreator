// scripts/codegen/gen-spells.mjs
// Generates spell .mdx files grouped by school

import { join } from 'node:path'
import { slugify } from './lib/slugger.mjs'
import { writeMdx } from './lib/writer.mjs'
import { inferSpellTags } from './lib/tags.mjs'
import { toArcanumFm } from './lib/arcanum.mjs'

export function generateSpells(data) {
  const { SPELL_LIBRARY, ROOT } = data
  if (!SPELL_LIBRARY || SPELL_LIBRARY.length === 0) {
    console.log('  Spells: skipped (no data)')
    return 0
  }

  const baseDir = join(ROOT, 'entities', 'spells')

  // Group by school
  const bySchool = {}
  for (const spell of SPELL_LIBRARY) {
    const school = spell.school.toLowerCase().replace(/\s+/g, '-')
    if (!bySchool[school]) bySchool[school] = []
    bySchool[school].push(spell)
  }

  let count = 0

  for (const [school, spells] of Object.entries(bySchool)) {
    const dir = join(baseDir, school)

    // School index
    const schoolName = spells[0].school
    const byLevel = {}
    for (const s of spells) {
      if (!byLevel[s.level]) byLevel[s.level] = []
      byLevel[s.level].push(s)
    }

    const schoolIndexFm = {
      type: 'index',
      name: `${schoolName} Spells`,
      school: schoolName,
      tags: ['index', `school:${school}`],
      count: spells.length,
      byLevel: Object.entries(byLevel).map(([lvl, ss]) => ({ level: Number(lvl), count: ss.length })),
    }
    writeMdx(dir, school, schoolIndexFm, buildSchoolIndexBody(schoolName, school, byLevel))

    // Individual spells
    for (const spell of spells) {
      const slug = slugify(spell.name)
      const tags = inferSpellTags(spell)

      const fields = {
        school: spell.school,
        level: spell.level,
        classes: spell.classes,
      }
      const fm = toArcanumFm('spell', spell.name, fields, tags)

      const body = buildSpellBody(spell, school, schoolName)
      writeMdx(dir, slug, fm, body)
      count++
    }
  }

  // Spells index
  const spellsIndexFm = {
    type: 'index',
    name: 'Spells',
    tags: ['index'],
    count,
    schools: Object.entries(bySchool).map(([s, ss]) => ({
      name: ss[0].school,
      slug: s,
      count: ss.length,
    })),
  }
  writeMdx(baseDir, 'spells', spellsIndexFm, buildSpellsIndexBody(bySchool))

  console.log(`  Spells: ${count} files`)
  return count
}

function buildSpellBody(spell, schoolSlug, schoolName) {
  let body = `## ${spell.name}\n\n`
  body += `**School:** ${spell.school}  \n`
  body += `**Level:** ${spell.level}  \n`
  body += `**Classes:** ${spell.classes.join(', ')}\n`

  body += `\n### Available To\n\n`
  for (const cls of spell.classes) {
    const clsSlug = slugify(cls)
    // Link to class - try base dir first, then variant dirs
    body += `- ${cls}\n`
  }

  body += `\n---\n\n[Back to ${schoolName}](./${schoolSlug}.mdx)\n`
  return body
}

function buildSchoolIndexBody(schoolName, schoolSlug, byLevel) {
  let body = `## ${schoolName} Spells\n\n`

  const levels = Object.keys(byLevel).map(Number).sort((a, b) => a - b)
  for (const level of levels) {
    body += `### Level ${level}\n\n`
    for (const spell of byLevel[level]) {
      const slug = slugify(spell.name)
      body += `- [${spell.name}](./${slug}.mdx) — ${spell.classes.join(', ')}\n`
    }
    body += '\n'
  }

  body += `---\n\n[Back to Spells](../spells.mdx)\n`
  return body
}

function buildSpellsIndexBody(bySchool) {
  let body = `## Spells by School\n\n`
  body += `| School | Count |\n`
  body += `|--------|-------|\n`
  for (const [schoolSlug, spells] of Object.entries(bySchool)) {
    const schoolName = spells[0].school
    body += `| [${schoolName}](./${schoolSlug}/${schoolSlug}.mdx) | ${spells.length} |\n`
  }

  body += `\n### By Level\n\n`
  const byLevel = {}
  for (const spells of Object.values(bySchool)) {
    for (const s of spells) {
      if (!byLevel[s.level]) byLevel[s.level] = 0
      byLevel[s.level]++
    }
  }
  for (const level of Object.keys(byLevel).map(Number).sort((a, b) => a - b)) {
    body += `- Level ${level}: ${byLevel[level]} spells\n`
  }

  return body
}
