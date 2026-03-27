// scripts/codegen/gen-classes.mjs
// Generates class .mdx files in directory structure

import { join } from 'node:path'
import { slugify } from './lib/slugger.mjs'
import { writeMdx } from './lib/writer.mjs'
import { inferClassTags } from './lib/tags.mjs'

// Classes with known variant groupings
const VARIANT_DIRS = {
  'Barbarian': 'barbarian',
  'Bard': 'bard',
  'Cleric': 'cleric',
  'Druid': 'druid',
  'Fighter': 'fighter',
  'Monk': 'monk',
  'Paladin': 'paladin',
  'Ranger': 'ranger',
  'Rogue': 'rogue',
  'Sorcerer': 'sorcerer',
  'Wizard': 'wizard',
}

function getParentClass(name) {
  // "Barbarian (Totem)" -> "Barbarian"
  const match = name.match(/^([^(]+)\s*\(/)
  if (match) return match[1].trim()
  return null
}

function isDomainWizard(name) {
  return name.startsWith('Wizard (') && name.includes('Domain)')
}

export function generateClasses(data) {
  const { CLASSES, PRESTIGE_CLASSES, PRESTIGE_PREREQS, CLASS_BONUS_FEAT_LEVELS,
          BONUS_FEAT_LISTS, CLASS_PROFICIENCIES, CLASS_STYLE_TRACKS, CLASS_STYLE_INFO,
          ROOT } = data

  const baseDir = join(ROOT, 'content', 'classes')
  let count = 0

  // Separate base classes from variants
  const baseClasses = []
  const variants = []
  const domainWizards = []

  for (const cls of CLASSES) {
    const parent = getParentClass(cls.n)
    if (!parent) {
      baseClasses.push(cls)
    } else if (isDomainWizard(cls.n)) {
      domainWizards.push(cls)
    } else {
      variants.push(cls)
    }
  }

  // Build variant map: base class name -> [variants]
  const variantMap = {}
  for (const v of variants) {
    const parent = getParentClass(v.n)
    if (!variantMap[parent]) variantMap[parent] = []
    variantMap[parent].push(v)
  }
  // Add domain wizards to wizard variants
  if (!variantMap['Wizard']) variantMap['Wizard'] = []
  variantMap['Wizard'].push(...domainWizards)

  // Write base classes + variants
  for (const cls of baseClasses) {
    const slug = slugify(cls.n)
    const dirSlug = VARIANT_DIRS[cls.n] || slug
    const hasVariants = variantMap[cls.n] && variantMap[cls.n].length > 0
    const dir = hasVariants ? join(baseDir, dirSlug) : baseDir
    const classVariants = variantMap[cls.n] || []
    const bonusFeats = CLASS_BONUS_FEAT_LEVELS[cls.n] || null
    const profs = CLASS_PROFICIENCIES[cls.n] || []

    const tags = inferClassTags(cls)
    const fm = buildClassFm(cls, bonusFeats, profs, tags)
    if (classVariants.length) fm.variants = classVariants.map(v => ({ name: v.n, slug: slugify(v.n) }))

    const body = buildClassBody(cls, classVariants, bonusFeats, profs, hasVariants ? dirSlug : null)
    writeMdx(dir, slug, fm, body)
    count++

    // Write variants
    for (const v of classVariants) {
      const vSlug = slugify(v.n)
      const vBonusFeats = CLASS_BONUS_FEAT_LEVELS[v.n] || null
      const vProfs = CLASS_PROFICIENCIES[v.n] || []
      const vTags = inferClassTags(v)

      const vFm = buildClassFm(v, vBonusFeats, vProfs, vTags)
      vFm.baseClass = cls.n
      const vBody = buildVariantBody(v, cls.n, vBonusFeats, vProfs)
      writeMdx(dir, vSlug, vFm, vBody)
      count++
    }
  }

  // Write standalone classes (no variants)
  for (const cls of baseClasses) {
    if (!variantMap[cls.n] || variantMap[cls.n].length === 0) {
      // Already written above
    }
  }

  // Prestige classes
  const prestigeDir = join(baseDir, 'prestige')
  for (const cls of PRESTIGE_CLASSES) {
    const slug = `prestige-${slugify(cls.n)}`
    const prereqs = PRESTIGE_PREREQS[cls.n] || null
    const bonusFeats = CLASS_BONUS_FEAT_LEVELS[cls.n] || null
    const profs = CLASS_PROFICIENCIES[cls.n] || []
    const tags = inferClassTags(cls)

    const fm = {
      type: 'class',
      subtype: 'prestige',
      name: cls.n,
      source: cls.s,
      hd: cls.hd,
      bab: cls.bab,
      saves: { fort: cls.fort, ref: cls.ref, will: cls.will },
      skillPoints: cls.sp,
      maxLevel: cls.maxLvl || null,
      classSkills: cls.cs,
      specialAbilities: cls.f,
      tags,
    }
    if (prereqs) fm.prereqs = prereqs
    if (bonusFeats) fm.bonusFeats = bonusFeats
    if (cls.special) fm.entryRequirements = cls.special
    if (profs.length) fm.proficiencies = profs

    const body = buildPrestigeBody(cls, prereqs)
    writeMdx(prestigeDir, slug, fm, body)
    count++
  }

  // Paragon classes (extracted from CLASSES where maxLvl exists)
  const paragonDir = join(baseDir, 'paragon')
  const paragonClasses = CLASSES.filter(c => c.maxLvl)
  for (const cls of paragonClasses) {
    const slug = slugify(cls.n)
    const profs = CLASS_PROFICIENCIES[cls.n] || []
    const tags = inferClassTags(cls)

    const fm = {
      type: 'class',
      subtype: 'paragon',
      name: cls.n,
      source: cls.s,
      hd: cls.hd,
      bab: cls.bab,
      saves: { fort: cls.fort, ref: cls.ref, will: cls.will },
      skillPoints: cls.sp,
      maxLevel: cls.maxLvl,
      classSkills: cls.cs,
      specialAbilities: cls.f,
      tags,
    }
    if (profs.length) fm.proficiencies = profs

    const body = buildParagonBody(cls)
    writeMdx(paragonDir, slug, fm, body)
    count++
  }

  // Classes index
  const indexFm = {
    type: 'index',
    name: 'Classes',
    tags: ['index'],
    baseClassCount: baseClasses.length,
    prestigeClassCount: PRESTIGE_CLASSES.length,
    paragonClassCount: paragonClasses.length,
  }
  writeMdx(baseDir, 'classes', indexFm, buildClassesIndexBody(baseClasses, PRESTIGE_CLASSES, paragonClasses))

  // Prestige index
  const prestigeIndexFm = {
    type: 'index',
    name: 'Prestige Classes',
    tags: ['index'],
    count: PRESTIGE_CLASSES.length,
  }
  writeMdx(prestigeDir, 'prestige-classes', prestigeIndexFm, buildPrestigeIndexBody(PRESTIGE_CLASSES))

  // Paragon index
  const paragonIndexFm = {
    type: 'index',
    name: 'Paragon Classes',
    tags: ['index'],
    count: paragonClasses.length,
  }
  writeMdx(paragonDir, 'paragon-classes', paragonIndexFm, buildParagonIndexBody(paragonClasses))

  console.log(`  Classes: ${count} files`)
  return count
}

function buildClassFm(cls, bonusFeats, profs, tags) {
  const fm = {
    type: 'class',
    name: cls.n,
    source: cls.s,
    hd: cls.hd,
    bab: cls.bab,
    saves: { fort: cls.fort, ref: cls.ref, will: cls.will },
    skillPoints: cls.sp,
    classSkills: cls.cs,
    specialAbilities: cls.f,
    tags,
  }
  if (bonusFeats) fm.bonusFeats = bonusFeats
  if (cls.maxLvl) fm.maxLevel = cls.maxLvl
  if (profs.length) fm.proficiencies = profs
  return fm
}

function buildClassBody(cls, classVariants, bonusFeats, profs, parentSlug) {
  let body = `## ${cls.n}\n\n`
  body += `**Source:** ${cls.s}  \n`
  body += `**Hit Die:** d${cls.hd}  \n`
  body += `**BAB:** ${cls.bab}  \n`
  body += `**Saves:** Fort ${cls.fort} / Ref ${cls.ref} / Will ${cls.will}  \n`
  body += `**Skill Points:** ${cls.sp}/level\n`

  if (profs.length) {
    body += `\n### Proficiencies\n\n`
    for (const p of profs[0]?.profs || []) {
      body += `- ${p}\n`
    }
  }

  body += `\n### Class Skills\n\n`
  body += cls.cs.join(', ') + '\n'

  body += `\n### Special Abilities\n\n`
  for (const f of cls.f) {
    body += `- ${f}\n`
  }

  if (classVariants.length > 0) {
    body += `\n### Variants\n\n`
    for (const v of classVariants) {
      body += `- [${v.n}](./${slugify(v.n)}.mdx)\n`
    }
  }

  body += `\n---\n\n[Back to Classes](../classes.mdx)\n`
  return body
}

function buildVariantBody(cls, baseName, bonusFeats, profs) {
  let body = `## ${cls.n}\n\n`
  body += `**Variant of:** [${baseName}](./${slugify(baseName)}.mdx)  \n`
  body += `**Source:** ${cls.s}  \n`
  body += `**Hit Die:** d${cls.hd}  \n`
  body += `**BAB:** ${cls.bab}  \n`
  body += `**Saves:** Fort ${cls.fort} / Ref ${cls.ref} / Will ${cls.will}  \n`
  body += `**Skill Points:** ${cls.sp}/level\n`

  body += `\n### Class Skills\n\n`
  body += cls.cs.join(', ') + '\n'

  body += `\n### Special Abilities\n\n`
  for (const f of cls.f) {
    body += `- ${f}\n`
  }

  body += `\n---\n\n[Back to ${baseName}](./${slugify(baseName)}.mdx)\n`
  return body
}

function buildPrestigeBody(cls, prereqs) {
  let body = `## ${cls.n}\n\n`
  body += `**Source:** ${cls.s}  \n`
  body += `**Hit Die:** d${cls.hd}  \n`
  body += `**BAB:** ${cls.bab}  \n`
  body += `**Saves:** Fort ${cls.fort} / Ref ${cls.ref} / Will ${cls.will}  \n`
  body += `**Skill Points:** ${cls.sp}/level  \n`
  if (cls.maxLvl) body += `**Max Level:** ${cls.maxLvl}\n`

  if (cls.special) {
    body += `\n### Entry Requirements\n\n${cls.special}\n`
  }

  if (prereqs) {
    body += `\n### Prerequisites\n\n`
    if (prereqs.bab) body += `- BAB +${prereqs.bab}\n`
    if (prereqs.feats) {
      for (const f of prereqs.feats) body += `- [${f}](../../feats/${slugify(f)}.mdx)\n`
    }
    if (prereqs.skills) {
      for (const [sk, ranks] of Object.entries(prereqs.skills)) {
        body += `- ${sk} ${ranks} ranks\n`
      }
    }
    if (prereqs.alignment) body += `- Alignment: ${prereqs.alignment}\n`
    if (prereqs.casterLevel) body += `- Caster Level ${prereqs.casterLevel}+ (${prereqs.casterType || 'any'})\n`
    if (prereqs.minCasterSpellLevel) body += `- Can cast ${prereqs.minCasterSpellLevel}${ordinal(prereqs.minCasterSpellLevel)}-level spells\n`
    if (prereqs.requiresPsionic) body += `- Psionic ability\n`
    if (prereqs.minSize) body += `- Size: ${prereqs.minSize}+\n`
    if (prereqs.special) body += `- *${prereqs.special}*\n`
  }

  body += `\n### Class Skills\n\n`
  body += cls.cs.join(', ') + '\n'

  body += `\n### Special Abilities\n\n`
  for (const f of cls.f) {
    body += `- ${f}\n`
  }

  body += `\n---\n\n[Back to Prestige Classes](./prestige-classes.mdx)\n`
  return body
}

function buildParagonBody(cls) {
  let body = `## ${cls.n}\n\n`
  body += `**Source:** ${cls.s}  \n`
  body += `**Hit Die:** d${cls.hd}  \n`
  body += `**Max Level:** ${cls.maxLvl}  \n`
  body += `**BAB:** ${cls.bab}  \n`
  body += `**Saves:** Fort ${cls.fort} / Ref ${cls.ref} / Will ${cls.will}  \n`
  body += `**Skill Points:** ${cls.sp}/level\n`

  body += `\n### Class Skills\n\n`
  body += cls.cs.join(', ') + '\n'

  body += `\n### Special Abilities\n\n`
  for (const f of cls.f) {
    body += `- ${f}\n`
  }

  body += `\n---\n\n[Back to Paragon Classes](./paragon-classes.mdx)\n`
  return body
}

function buildClassesIndexBody(baseClasses, prestigeClasses, paragonClasses) {
  let body = `## Base Classes\n\n`
  for (const cls of baseClasses) {
    const slug = slugify(cls.n)
    const dirSlug = VARIANT_DIRS[cls.n] || slug
    const hasVariants = cls.n in VARIANT_DIRS
    if (hasVariants) {
      body += `- [${cls.n}](./${dirSlug}/${slug}.mdx) — d${cls.hd}, ${cls.bab} BAB, ${cls.s}\n`
    } else {
      body += `- [${cls.n}](./${slug}.mdx) — d${cls.hd}, ${cls.bab} BAB, ${cls.s}\n`
    }
  }
  body += `\n## [Paragon Classes](./paragon/paragon-classes.mdx)\n\n`
  body += `## [Prestige Classes](./prestige/prestige-classes.mdx)\n`
  return body
}

function buildPrestigeIndexBody(prestigeClasses) {
  let body = `| Class | Source | BAB | HD | Max |\n|-------|--------|-----|----|----|\n`
  for (const cls of prestigeClasses) {
    const slug = slugify(cls.n)
    body += `| [${cls.n}](./prestige-${slug}.mdx) | ${cls.s} | ${cls.bab} | d${cls.hd} | ${cls.maxLvl || '—'} |\n`
  }
  return body
}

function buildParagonIndexBody(paragonClasses) {
  let body = `| Class | Race | HD | Max Level |\n|-------|------|----|----|\n`
  for (const cls of paragonClasses) {
    const slug = slugify(cls.n)
    const race = cls.n.replace(' Paragon', '')
    body += `| [${cls.n}](./${slug}.mdx) | ${race} | d${cls.hd} | ${cls.maxLvl} |\n`
  }
  return body
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}
