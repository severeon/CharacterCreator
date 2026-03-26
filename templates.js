// ─────────────────────────────────────────────────────────────────────────
// D&D 3.5 Gestalt Character Creator — Racial Templates Data
// ─────────────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { name: "None", la: 0, bonuses: {}, traits: [], features: [] },
  { name: "Half-Celestial", la: 4, bonuses: { str: 4, dex: 2, con: 2, int: 2, wis: 4, cha: 4 }, traits: ["Outsider (augmented)", "Darkvision 60 ft", "Immune: disease", "Resist acid/cold/electricity 10", "DR 5/magic", "SR 11+HD", "Smite Evil 1/day", "Fly (good, = land speed)"], features: ["Wings: fly speed = land speed", "Lay on Hands (CHA×HD HP/day)", "Protection from Evil 3/day"] },
  { name: "Half-Fiend", la: 4, bonuses: { str: 4, dex: 4, con: 2, int: 4, cha: 2 }, traits: ["Outsider (augmented)", "Darkvision 60 ft", "Immune: poison", "Resist acid/cold/electricity/fire 10", "DR 5/magic", "SR 11+HD", "Smite Good 1/day", "Fly (average, = land speed)"], features: ["Wings: fly speed = land speed", "Natural weapons: 2 claws (1d4) + bite (1d6)"] },
  { name: "Half-Dragon", la: 3, bonuses: { str: 8, con: 2, int: 2, cha: 2 }, traits: ["Dragon type (augmented)", "Darkvision 60 ft / Low-light vision", "Immune: sleep/paralysis + energy by color", "Natural armor +4", "Breath weapon"], features: ["Breath weapon: 2d6+1d6/2HD (choose energy)", "Natural weapons: 2 claws + bite"] },
  { name: "Celestial Creature", la: 0, bonuses: {}, traits: ["Smite Evil 1/day", "DR by HD", "Resist acid/cold/electricity 5", "SR"], features: ["Good outsider subtype added"] },
  { name: "Fiendish Creature", la: 0, bonuses: {}, traits: ["Smite Good 1/day", "DR by HD", "Resist cold/fire 5", "SR"], features: ["Evil outsider subtype added"] },
  { name: "Vampire", la: 8, bonuses: { str: 6, dex: 4, int: 2, wis: 2, cha: 4 }, traits: ["Undead", "DR 10/silver+magic", "Resist cold/electricity 10", "Fast healing 5", "Gaseous Form/Spider Climb at will", "Energy drain (2 levels) on bite", "Turn resistance +4", "LA +8"], features: ["Requires 5th level or higher", "Weaknesses: holy water/sunlight/running water"] },
  { name: "Lich", la: 4, bonuses: { int: 2, wis: 2, cha: 2 }, traits: ["Undead", "DR 15/bludgeoning+magic", "Immune: cold/electricity/polymorph/mind-affecting", "Turn resistance +4", "Paralyzing touch", "Frightful presence (Will save)"], features: ["Requires 11th level arcane caster", "Rejuvenation via phylactery"] },
  { name: "Werewolf", la: 3, bonuses: { str: 2, dex: 4, con: 4 }, traits: ["Shapechanger", "Wolf or hybrid alternate form", "Curse of lycanthropy (bite)", "DR 10/silver", "Low-light vision", "Scent", "LA +3"], features: ["Favored class: Ranger", "Control form check at moon"] },
  { name: "Ghost", la: 5, bonuses: { wis: 4, cha: 4 }, traits: ["Undead (incorporeal)", "Manifestation", "Rejuvenation", "Turn resistance +4", "Corrupting touch / Horrific Appearance", "Malevolence (possess living)", "LA +5"], features: ["50% miss chance vs non-magical attacks", "Str becomes — (use Dex for melee)"] },
  { name: "Feral", la: 1, bonuses: { str: 2, dex: 2, wis: 2, int: -2, cha: -2 }, traits: ["Natural weapons: 2 claws (1d4) + bite (1d4)", "Low-light vision", "Scent", "LA +1"], features: ["Loses weapon/armor proficiency", "Bonus: Track feat"] },
]
