export type AbilityKey = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'

export interface Skill {
  name: string
  ability: AbilityKey
}

export const ALL_SKILLS: Skill[] = [
  { name: 'Appraise', ability: 'INT' },
  { name: 'Balance', ability: 'DEX' },
  { name: 'Bluff', ability: 'CHA' },
  { name: 'Climb', ability: 'STR' },
  { name: 'Concentration', ability: 'CON' },
  { name: 'Craft', ability: 'INT' },
  { name: 'Decipher Script', ability: 'INT' },
  { name: 'Diplomacy', ability: 'CHA' },
  { name: 'Disable Device', ability: 'INT' },
  { name: 'Disguise', ability: 'CHA' },
  { name: 'Escape Artist', ability: 'DEX' },
  { name: 'Forgery', ability: 'INT' },
  { name: 'Gather Information', ability: 'CHA' },
  { name: 'Handle Animal', ability: 'CHA' },
  { name: 'Heal', ability: 'WIS' },
  { name: 'Hide', ability: 'DEX' },
  { name: 'Intimidate', ability: 'CHA' },
  { name: 'Jump', ability: 'STR' },
  { name: 'Knowledge(Arcana)', ability: 'INT' },
  { name: 'Knowledge(Dungeoneering)', ability: 'INT' },
  { name: 'Knowledge(Engineering)', ability: 'INT' },
  { name: 'Knowledge(Geography)', ability: 'INT' },
  { name: 'Knowledge(History)', ability: 'INT' },
  { name: 'Knowledge(Local)', ability: 'INT' },
  { name: 'Knowledge(Nature)', ability: 'INT' },
  { name: 'Knowledge(Nobility)', ability: 'INT' },
  { name: 'Knowledge(Planes)', ability: 'INT' },
  { name: 'Knowledge(Religion)', ability: 'INT' },
  { name: 'Listen', ability: 'WIS' },
  { name: 'Move Silently', ability: 'DEX' },
  { name: 'Open Lock', ability: 'DEX' },
  { name: 'Perform', ability: 'CHA' },
  { name: 'Profession', ability: 'WIS' },
  { name: 'Ride', ability: 'DEX' },
  { name: 'Search', ability: 'INT' },
  { name: 'Sense Motive', ability: 'WIS' },
  { name: 'Sleight of Hand', ability: 'DEX' },
  { name: 'Spellcraft', ability: 'INT' },
  { name: 'Spot', ability: 'WIS' },
  { name: 'Survival', ability: 'WIS' },
  { name: 'Swim', ability: 'STR' },
  { name: 'Tumble', ability: 'DEX' },
  { name: 'Use Magic Device', ability: 'CHA' },
]

export type AbilityName = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'

export const ABILITY_KEY_MAP: Record<AbilityName, AbilityKey> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
}
