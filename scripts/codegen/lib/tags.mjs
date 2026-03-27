// scripts/codegen/lib/tags.mjs
// Universal tag inference for all entity types

const SOURCE_MAP = {
  'PHB': 'source:phb',
  'Player\'s Handbook': 'source:phb',
  'PH II': 'source:ph2',
  'Player\'s Handbook II': 'source:ph2',
  'DMG': 'source:dmg',
  'Unearthed Arcana': 'source:ua',
  'Complete Warrior': 'source:cw',
  'Complete Arcane': 'source:ca',
  'Complete Divine': 'source:cd',
  'Complete Adventurer': 'source:cadv',
  'Complete Champion': 'source:cch',
  'Complete Mage': 'source:cm',
  'Complete Scoundrel': 'source:cs',
  'Complete Psionic': 'source:cp',
  'Eberron': 'source:ecs',
  'Eberron (UA variant)': 'source:ecs',
  'XPH': 'source:xph',
  'Expanded Psionics Handbook': 'source:xph',
  'Tome of Battle': 'source:tob',
  'Tome of Magic': 'source:tom',
  'Heroes of Horror': 'source:hoh',
  'Heroes of Battle': 'source:hob',
  'Magic of Incarnum': 'source:moi',
  'Dungeonscape': 'source:dun',
  'Miniatures Handbook': 'source:mh',
  'Races of the Wild': 'source:rotw',
  'Races of Stone': 'source:ros',
  'Races of the Dragon': 'source:rotd',
  'Races of Destiny': 'source:rod',
  'Libris Mortis': 'source:lm',
  'Lords of Madness': 'source:lom',
  'Draconomicon': 'source:dra',
  'Planar Handbook': 'source:phand',
  'Manual of the Planes': 'source:motp',
  'Frostburn': 'source:frb',
  'Sandstorm': 'source:san',
  'Stormwrack': 'source:stm',
  'Player\'s Guide to Faerûn': 'source:pgtf',
  'Player\'s Handbook/Forgotten Realms': 'source:pgtf',
  'Magic of Faerûn': 'source:mof',
  'Races of Faerûn': 'source:rof',
}

export function inferSourceTag(source) {
  return SOURCE_MAP[source] || 'source:other'
}

export function inferRaceTags(race) {
  const tags = []
  tags.push(inferSourceTag(race.source || 'PHB'))

  // LA-based tags
  if (race.la === 0) tags.push('la:standard')
  else if (race.la > 0) tags.push('la:advanced')
  else tags.push('la:reduced')

  // Role inference from bonuses
  if (race.bonuses) {
    if (race.bonuses.str >= 2) tags.push('role:combat')
    if (race.bonuses.int >= 2) tags.push('role:caster')
    if (race.bonuses.wis >= 2) tags.push('role:support')
    if (race.bonuses.dex >= 4) tags.push('role:stealth')
    if (race.bonuses.cha >= 2) tags.push('role:caster')
  }

  // Traits-based tags
  if (race.traits) {
    const t = race.traits.join(' ').toLowerCase()
    if (t.includes('psionic')) tags.push('psionic')
    if (t.includes('undead')) tags.push('undead')
    if (t.includes('outsider')) tags.push('outsider')
    if (t.includes('construct')) tags.push('construct')
    if (t.includes('dragon')) tags.push('dragon')
    if (t.includes('darkvision')) tags.push('darkvision')
    if (t.includes('spell resistance')) tags.push('spell-resistance')
    if (t.includes('natural armor')) tags.push('natural-armor')
    if (t.includes('natural weapon')) tags.push('natural-weapons')
    if (t.includes('fly speed')) tags.push('flight')
    if (t.includes('swim speed')) tags.push('aquatic')
  }

  return tags
}

export function inferTemplateTags(tpl) {
  const tags = [inferSourceTag(tpl.source || 'PHB'), 'template']
  if (tpl.la >= 3) tags.push('la:advanced')
  return tags
}

export function inferClassTags(cls) {
  const tags = [inferSourceTag(cls.s)]

  // Role from stats
  if (cls.hd >= 10 && cls.bab === 'full') tags.push('role:tank')
  if (cls.hd <= 6 && (cls.fort === 'poor' && cls.ref === 'poor')) tags.push('role:caster')
  if (cls.sp >= 6) tags.push('role:skill')

  // Caster detection
  if (cls.f) {
    const features = cls.f.join(' ').toLowerCase()
    if (features.includes('spellcasting') || features.includes('spell')) tags.push('role:caster')
    if (features.includes('psionic') || features.includes('power')) tags.push('role:psionic')
    if (features.includes('heal') || features.includes('cure')) tags.push('role:healing')
    if (features.includes('sneak attack') || features.includes('hide')) tags.push('role:stealth')
  }

  // Subtype
  if (cls.prestige) tags.push('prestige')
  if (cls.n.includes('(') && !cls.n.includes('Domain')) tags.push('variant')
  if (cls.n.includes('Domain')) tags.push('domain')

  return tags
}

export function inferFeatTags(featName, prereqs, bonusFeatFor) {
  const tags = ['source:phb'] // all feats are PHB currently

  if (prereqs) {
    if (prereqs.requiresSpellcasting) tags.push('metamagic')
    if (prereqs.requiresPsionic) tags.push('psionic')
    if (prereqs.feats && prereqs.feats.some(f => f.includes('Weapon'))) tags.push('combat-maneuver')
    if (prereqs.bab) tags.push('combat')
    if (prereqs.casterLevel) tags.push('crafting')
  }

  // From name patterns
  const lower = featName.toLowerCase()
  if (lower.includes('weapon')) tags.push('combat')
  if (lower.includes('spell') || lower.includes('metamagic')) tags.push('metamagic')
  if (lower.includes('craft')) tags.push('crafting')
  if (lower.includes('mounted') || lower.includes('ride')) tags.push('mounted')
  if (lower.includes('two-weapon') || lower.includes('dual')) tags.push('two-weapon')
  if (lower.includes('shot') || lower.includes('bow') || lower.includes('archery') || lower.includes('ranged')) tags.push('archery')
  if (lower.includes('psionic') || lower.includes('power')) tags.push('psionic')
  if (lower.includes('improved') || lower.includes('greater')) tags.push('combat-maneuver')

  // Class-specific
  if (bonusFeatFor && bonusFeatFor.length > 0) {
    if (bonusFeatFor.includes('Fighter')) tags.push('fighter')
    if (bonusFeatFor.includes('Wizard')) tags.push('wizard')
    if (bonusFeatFor.includes('Monk')) tags.push('monk')
  }

  return [...new Set(tags)]
}

export function inferSpellTags(spell) {
  const tags = [inferSourceTag('PHB')] // all spells currently PHB

  tags.push(`school:${spell.school.toLowerCase()}`)
  tags.push(`level:${spell.level}`)

  // Role from school
  if (spell.school === 'Conjuration' && spell.name.match(/cure|heal/i)) tags.push('role:healing')
  else if (spell.school === 'Evocation') tags.push('role:damage')
  else if (spell.school === 'Enchantment') tags.push('role:debuff')
  else if (spell.school === 'Abjuration') tags.push('role:buff')
  else if (spell.school === 'Necromancy') tags.push('role:debuff')
  else if (spell.school === 'Divination') tags.push('role:utility')
  else if (spell.school === 'Illusion') tags.push('role:utility')
  else if (spell.school === 'Transmutation') tags.push('role:buff')

  // Mechanical tags
  const lower = spell.name.toLowerCase()
  if (lower.includes('summon')) tags.push('summoning')
  if (lower.includes('cure') || lower.includes('heal') || lower.includes('restore')) tags.push('healing')
  if (lower.includes('fire') || lower.includes('flame') || lower.includes('burn')) tags.push('fire')
  if (lower.includes('cold') || lower.includes('ice') || lower.includes('frost')) tags.push('cold')
  if (lower.includes('lightning') || lower.includes('electric') || lower.includes('shock')) tags.push('electricity')
  if (lower.includes('acid')) tags.push('acid')
  if (lower.includes('charm') || lower.includes('dominate')) tags.push('charm')
  if (lower.includes('teleport')) tags.push('teleportation')
  if (lower.includes('invisible') || lower.includes('invisibility')) tags.push('invisibility')
  if (lower.includes('fly') || lower.includes('levitate')) tags.push('flight')
  if (lower.includes('wall') || lower.includes('shield') || lower.includes('armor')) tags.push('defense')

  return [...new Set(tags)]
}
