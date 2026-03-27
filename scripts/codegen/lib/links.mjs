// scripts/codegen/lib/links.mjs
// Builds all bidirectional link maps

import { slugify } from './slugger.mjs'

export function buildAllLinks(data) {
  const { BASE_FEATS, BONUS_FEAT_LISTS, FEAT_PREREQS, PRESTIGE_CLASSES, PRESTIGE_PREREQS,
          CLASSES, RACES, TEMPLATES, SPELL_LIBRARY } = data

  // feat name -> [class names that grant it as bonus feat]
  const featToBonusSources = {}
  for (const [className, listDef] of Object.entries(BONUS_FEAT_LISTS)) {
    const feats = listDef.feats || []
    for (const f of feats) {
      if (!featToBonusSources[f]) featToBonusSources[f] = []
      if (!featToBonusSources[f].includes(className)) featToBonusSources[f].push(className)
    }
    if (listDef.byLevel) {
      for (const levelFeats of Object.values(listDef.byLevel)) {
        for (const f of levelFeats) {
          if (!featToBonusSources[f]) featToBonusSources[f] = []
          if (!featToBonusSources[f].includes(className)) featToBonusSources[f].push(className)
        }
      }
    }
  }

  // feat name -> [feat names that require this feat]
  const featToUnlocks = {}
  for (const [featName, prereqs] of Object.entries(FEAT_PREREQS)) {
    if (prereqs.feats) {
      for (const req of prereqs.feats) {
        if (!featToUnlocks[req]) featToUnlocks[req] = []
        if (!featToUnlocks[req].includes(featName)) featToUnlocks[req].push(featName)
      }
    }
  }

  // class name -> [spell names available to that class]
  const classToSpells = {}
  for (const spell of SPELL_LIBRARY) {
    for (const cls of spell.classes) {
      if (!classToSpells[cls]) classToSpells[cls] = []
      classToSpells[cls].push(spell.name)
    }
  }

  // spell name -> [class slugs]
  const spellToClassSlugs = {}
  for (const spell of SPELL_LIBRARY) {
    spellToClassSlugs[spell.name] = spell.classes.map(c => slugify(c))
  }

  // prestige class name -> prereq feat slugs
  const prestigeToFeatSlugs = {}
  for (const [name, prereqs] of Object.entries(PRESTIGE_PREREQS)) {
    if (prereqs.feats) {
      prestigeToFeatSlugs[name] = prereqs.feats.map(f => slugify(f))
    }
  }

  // race cat -> race slugs
  const catToRaceSlugs = {}
  for (const race of RACES) {
    if (!catToRaceSlugs[race.cat]) catToRaceSlugs[race.cat] = []
    catToRaceSlugs[race.cat].push(slugify(race.name))
  }

  return {
    featToBonusSources,
    featToUnlocks,
    classToSpells,
    spellToClassSlugs,
    prestigeToFeatSlugs,
    catToRaceSlugs,
  }
}

export function mdxLink(text, relPath) {
  return `[${text}](${relPath})`
}
