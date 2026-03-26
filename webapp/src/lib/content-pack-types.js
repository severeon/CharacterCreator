// webapp/src/lib/content-pack-types.js

/**
 * @typedef {Object} Race
 * @property {'race'} type
 * @property {string} name
 * @property {string} category
 * @property {number} la  - Level Adjustment
 * @property {number} rhd - Racial Hit Dice count
 * @property {number} rhdType - Racial Hit Die size (e.g. 8 for d8)
 * @property {Object.<string, number>} bonuses - Ability score bonuses, e.g. { str: 2, con: -2 }
 * @property {string[]} traits
 */

/**
 * @typedef {'full'|'3/4'|'1/2'} BabProgression
 * @typedef {'good'|'poor'} SaveProgression
 *
 * @typedef {Object} DndClass
 * @property {'class'} type
 * @property {string} name
 * @property {number} hd - Hit die size
 * @property {BabProgression} bab
 * @property {SaveProgression} fort
 * @property {SaveProgression} ref
 * @property {SaveProgression} will
 * @property {number} skillPoints - Skill points per level (before INT mod)
 * @property {string[]} classSkills
 * @property {boolean} prestige
 * @property {number} [maxLvl] - Max level for prestige classes
 * @property {number[]} [bonusFeats] - Levels that grant bonus feats
 * @property {string} [bonusFeatList] - Key into BONUS_FEAT_LISTS
 * @property {string} [special] - Freetext special abilities note
 */

/**
 * @typedef {Object} FeatPrereqs
 * @property {number} [bab]
 * @property {number} [str] @property {number} [dex] @property {number} [con]
 * @property {number} [int] @property {number} [wis] @property {number} [cha]
 * @property {string[]} [feats]
 * @property {Object.<string, number>} [skills]
 * @property {string} [special]
 *
 * @typedef {Object} Feat
 * @property {'feat'} type
 * @property {string} name
 * @property {FeatPrereqs} [prereqs]
 * @property {string[]} [bonusFeatLists] - Which class bonus feat lists include this feat
 */

/**
 * @typedef {Object} Spell
 * @property {'spell'} type
 * @property {string} name
 * @property {string} school
 * @property {string} [subschool]
 * @property {string} [descriptor]
 * @property {Object.<string, number>} classes - { wizard: 3, sorcerer: 3 }
 * @property {string[]} [components]
 * @property {string} [castingTime]
 * @property {string} [range]
 * @property {string} [duration]
 * @property {string} [savingThrow]
 * @property {boolean} [spellResistance]
 */

/**
 * @typedef {Object} Power
 * @property {'power'} type
 * @property {string} name
 * @property {string} discipline
 * @property {string} [descriptor]
 * @property {Object.<string, number>} classes - { psion: 1, wilder: 1 }
 * @property {number} powerPoints
 * @property {boolean} [augment]
 */

/**
 * @typedef {Object} Invocation
 * @property {'invocation'} type
 * @property {string} name
 * @property {'least'|'lesser'|'greater'|'dark'} grade
 * @property {string} [description]
 */

/**
 * @typedef {Object} Campaign
 * @property {'campaign'} type
 * @property {string} name
 * @property {'4d6'|'array'|'pointBuy'} abilityScoreMethod
 * @property {number} [pointBuyBudget]
 * @property {string[]} [allowedSources]
 * @property {string[]} [disabledClasses]
 * @property {string} [passwordHash]
 */

/**
 * @typedef {Object} ContentPack
 * @property {Race[]} races
 * @property {DndClass[]} classes
 * @property {Feat[]} feats
 * @property {Spell[]} spells
 * @property {Power[]} powers
 * @property {Invocation[]} invocations
 * @property {Campaign[]} campaigns
 */

export {}
