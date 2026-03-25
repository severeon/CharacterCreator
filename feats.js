// ─────────────────────────────────────────────────────────────────────────
// D&D 3.5 Gestalt Character Creator — Feats Data File
// Edit this file to add, modify or remove feats, prerequisites, and feat lists.
// ─────────────────────────────────────────────────────────────────────────

const BASE_FEATS = ["Alertness","Athletic","Blind-Fight","Combat Expertise","Combat Reflexes","Deceitful","Deft Hands","Diligent","Dodge","Endurance","Exotic Weapon Proficiency","Great Fortitude","Improved Bull Rush","Improved Critical","Improved Disarm","Improved Feint","Improved Grapple","Improved Initiative","Improved Overrun","Improved Shield Bash","Improved Sunder","Improved Trip","Improved Two-Weapon Fighting","Improved Unarmed Strike","Investigator","Iron Will","Leadership","Lightning Reflexes","Magical Aptitude","Manyshot","Mobility","Mounted Archery","Mounted Combat","Natural Spell","Negotiator","Nimble Fingers","Persuasive","Point Blank Shot","Power Attack","Precise Shot","Quick Draw","Rapid Reload","Rapid Shot","Ride-By Attack","Run","Self-Sufficient","Shield Proficiency","Shot on the Run","Skill Focus","Spell Focus","Spell Mastery","Spell Penetration","Spring Attack","Stealthy","Stunning Fist","Toughness","Track","Two-Weapon Defense","Two-Weapon Fighting","Weapon Finesse","Weapon Focus","Weapon Specialization","Whirlwind Attack","Acrobatic","Agile","Arcane Strike","Battle Casting","Cleave","Combat Casting","Craft Wondrous Item","Divine Spell Power","Extra Rage","Extra Smiting","Extra Turning","Far Shot","Fleet of Foot","Force of Personality","Greater Cleave","Greater Spell Focus","Greater Spell Penetration","Greater Two-Weapon Fighting","Greater Weapon Focus","Greater Weapon Specialization","Improved Counterspell","Improved Familiar","Improved Precise Shot","Intuitive Attack","Practiced Spellcaster","Quicken Spell","Empower Spell","Enlarge Spell","Extend Spell","Maximize Spell","Silent Spell","Still Spell","Hold the Line","Karmic Strike","Defensive Strike","Robilar's Gambit","Psionic Meditation","Psionic Body","Psionic Talent","Burrowing Power","Chain Power","Delay Power","Fortify Power","Split Psionic Ray"];

const CLASS_BONUS_FEAT_LEVELS = {
  "Fighter":         [1,2,4,6,8,10,12,14,16,18,20],
  "Wizard":          [5,10,15,20],
  "Monk":            [1,2,6],
  "Ranger":          [2,6],
  "Swashbuckler":    [1,5],
  "Psychic Warrior": [1,2,4,6,8,10,12,14,16,18,20],
  "Warblade":        [1,5,9,13,17],
  "Crusader":        [1],
  "Swordsage":       [1],
  "Knight":          [1],
};

const BONUS_FEAT_LISTS = {
  // Fighter: any feat with [Fighter] tag — combat feats from PHB/supplements
  // Per RAW: any feat on the Fighter bonus feat list (combat, tactical, etc.)
  // We tag the FEAT_PREREQS entries — feats with no tag default to "general"
  "Fighter": {tags:["fighter","combat"], feats:[
    "Acrobatic","Agile","Alertness","Animal Affinity","Athletic",
    "Blind-Fight","Combat Expertise","Combat Reflexes",
    "Deceitful","Deft Hands","Diligent","Dodge","Endurance",
    "Exotic Weapon Proficiency","Great Fortitude","Improved Bull Rush",
    "Improved Critical","Improved Disarm","Improved Feint","Improved Grapple",
    "Improved Initiative","Improved Overrun","Improved Shield Bash","Improved Sunder",
    "Improved Trip","Improved Two-Weapon Fighting","Improved Unarmed Strike",
    "Investigator","Iron Will","Leadership","Lightning Reflexes","Magical Aptitude",
    "Manyshot","Mobility","Mounted Archery","Mounted Combat","Negotiator",
    "Nimble Fingers","Persuasive","Point Blank Shot","Power Attack","Precise Shot",
    "Quick Draw","Rapid Reload","Rapid Shot","Ride-By Attack","Run","Self-Sufficient",
    "Shield Proficiency","Shot on the Run","Skill Focus","Spell Focus","Spell Penetration",
    "Spring Attack","Stealthy","Stunning Fist","Toughness","Track",
    "Two-Weapon Defense","Two-Weapon Fighting","Weapon Finesse","Weapon Focus",
    "Weapon Specialization","Whirlwind Attack",
    "Arcane Strike","Battle Casting","Cleave","Combat Casting",
    "Far Shot","Fleet of Foot","Greater Cleave","Greater Spell Focus",
    "Greater Spell Penetration","Greater Two-Weapon Fighting",
    "Greater Weapon Focus","Greater Weapon Specialization",
    "Hold the Line","Improved Counterspell","Improved Familiar",
    "Improved Precise Shot","Karmic Strike","Defensive Strike","Robilar's Gambit",
  ]},
  // Wizard: metamagic or item creation feats only
  "Wizard": {feats:[
    "Empower Spell","Enlarge Spell","Extend Spell","Heighten Spell",
    "Maximize Spell","Quicken Spell","Silent Spell","Still Spell",
    "Twin Spell","Widen Spell",
    "Brew Potion","Craft Magic Arms and Armor","Craft Rod","Craft Staff",
    "Craft Wand","Craft Wondrous Item","Forge Ring","Scribe Scroll",
    "Spell Mastery","Spell Focus","Greater Spell Focus",
    "Spell Penetration","Greater Spell Penetration",
    "Improved Counterspell","Improved Familiar","Combat Casting","Practiced Spellcaster",
  ]},
  // Monk: specific list per PHB
  "Monk": {feats:[
    "Combat Reflexes","Deflect Arrows","Improved Disarm","Improved Grapple",
    "Improved Trip","Improved Unarmed Strike","Snatch Arrows","Stunning Fist",
    "Weapon Finesse",
  ]},
  // Ranger: combat style feats (Two-Weapon Fighting track or Archery track)
  "Ranger": {feats:[
    // Two-weapon style
    "Two-Weapon Fighting","Improved Two-Weapon Fighting","Greater Two-Weapon Fighting",
    "Two-Weapon Defense",
    // Archery style
    "Rapid Shot","Manyshot","Improved Precise Shot",
  ]},
  // Swashbuckler: Weapon Finesse at 1, Dodge at 5
  "Swashbuckler": {byLevel:{1:["Weapon Finesse"], 5:["Dodge"]}},
  // Psychic Warrior: psionic feats only
  "Psychic Warrior": {feats:[
    "Psionic Body","Psionic Talent","Psionic Meditation",
    "Speed of Thought","Up the Walls","Wild Talent","Narrow Mind",
    "Focused","Improved Speed","Mental Leap","Psionic Charge",
    "Psionic Dodge","Psionic Fist","Psionic Weapon","Stand Still",
    // Also allow combat feats that Psychic Warriors can take
    "Combat Expertise","Dodge","Improved Bull Rush","Improved Disarm",
    "Improved Grapple","Improved Initiative","Improved Overrun","Improved Sunder",
    "Improved Trip","Improved Unarmed Strike","Power Attack","Weapon Focus",
    "Weapon Finesse",
  ]},
  // Warblade: any Fighter bonus feat plus Weapon Focus
  "Warblade": {feats:[
    "Weapon Focus","Weapon Specialization","Greater Weapon Focus","Greater Weapon Specialization",
    "Improved Critical","Combat Expertise","Combat Reflexes","Dodge","Endurance",
    "Improved Bull Rush","Improved Disarm","Improved Grapple","Improved Initiative",
    "Improved Overrun","Improved Sunder","Improved Trip","Improved Two-Weapon Fighting",
    "Improved Unarmed Strike","Mobility","Mounted Combat","Power Attack","Quick Draw",
    "Rapid Shot","Shield Proficiency","Spring Attack","Toughness","Two-Weapon Fighting",
    "Whirlwind Attack","Weapon Finesse",
  ]},
  // Crusader: Weapon Focus (any)
  "Crusader": {feats:["Weapon Focus"]},
  // Swordsage: any Weapon Focus
  "Swordsage": {feats:["Weapon Focus"]},
  // Knight: mounted/combat feats only
  "Knight": {feats:[
    "Mounted Combat","Ride-By Attack","Spirited Charge","Trample",
    "Mounted Archery","Power Attack","Cleave","Great Cleave",
    "Improved Critical","Weapon Focus","Weapon Specialization",
  ]},
};

const FEAT_PREREQS = {
  // ── Combat chain ──────────────────────────────────────────────────────────
  "Cleave":              {bab:1, feats:["Power Attack"]},
  "Great Cleave":        {bab:4, feats:["Cleave","Power Attack"]},
  "Improved Bull Rush":  {feats:["Power Attack"]},
  "Improved Overrun":    {feats:["Power Attack"]},
  "Improved Sunder":     {feats:["Power Attack"]},
  "Combat Expertise":    {int:13},
  "Improved Disarm":     {int:13, feats:["Combat Expertise"]},
  "Improved Feint":      {int:13, feats:["Combat Expertise"]},
  "Improved Trip":       {int:13, feats:["Combat Expertise"]},
  "Whirlwind Attack":    {int:13, dex:13, bab:4, feats:["Combat Expertise","Dodge","Mobility","Spring Attack"]},
  "Dodge":               {dex:13},
  "Mobility":            {dex:13, feats:["Dodge"]},
  "Spring Attack":       {dex:13, bab:4, feats:["Dodge","Mobility"]},
  "Shot on the Run":     {dex:13, bab:4, feats:["Dodge","Mobility","Point Blank Shot"]},
  "Ride-By Attack":      {feats:["Mounted Combat"]},
  "Spirited Charge":     {feats:["Mounted Combat","Ride-By Attack"]},
  "Trample":             {feats:["Mounted Combat"]},
  "Improved Two-Weapon Fighting": {dex:17, bab:6, feats:["Two-Weapon Fighting"]},
  "Greater Two-Weapon Fighting":  {dex:19, bab:11, feats:["Improved Two-Weapon Fighting","Two-Weapon Fighting"]},
  "Two-Weapon Defense":  {feats:["Two-Weapon Fighting"]},
  "Two-Weapon Fighting": {dex:15},
  "Manyshot":            {dex:17, bab:6, feats:["Point Blank Shot","Rapid Shot"]},
  "Improved Precise Shot":{dex:19, bab:11, feats:["Point Blank Shot","Precise Shot"]},
  "Precise Shot":        {feats:["Point Blank Shot"]},
  "Rapid Shot":          {dex:13, feats:["Point Blank Shot"]},
  "Far Shot":            {feats:["Point Blank Shot"]},
  "Mounted Archery":     {feats:["Mounted Combat"]},
  "Stunning Fist":       {dex:13, wis:13, bab:8, feats:["Improved Unarmed Strike"]},
  "Improved Grapple":    {dex:13, feats:["Improved Unarmed Strike"]},
  "Deflect Arrows":      {dex:13, feats:["Improved Unarmed Strike"]},
  "Snatch Arrows":       {dex:15, feats:["Deflect Arrows","Improved Unarmed Strike"]},
  "Improved Unarmed Strike": {},
  "Weapon Specialization":{bab:4, feats:["Weapon Focus"], special:"Fighter level 4 required"},
  "Greater Weapon Focus": {bab:8, feats:["Weapon Focus"], special:"Fighter level 8 required"},
  "Greater Weapon Specialization":{bab:12, feats:["Greater Weapon Focus","Weapon Focus","Weapon Specialization"], special:"Fighter level 12 required"},
  "Improved Critical":   {bab:8},
  "Hold the Line":       {feats:["Combat Reflexes"]},
  "Karmic Strike":       {dex:13, feats:["Combat Expertise"]},
  "Robilar's Gambit":    {bab:12, feats:["Combat Expertise"]},
  "Defensive Strike":    {bab:5, feats:["Combat Expertise"]},
  // ── Metamagic ──────────────────────────────────────────────────────────────
  "Quicken Spell":       {requiresSpellcasting:true},
  "Empower Spell":       {requiresSpellcasting:true},
  "Enlarge Spell":       {requiresSpellcasting:true},
  "Extend Spell":        {requiresSpellcasting:true},
  "Maximize Spell":      {requiresSpellcasting:true},
  "Silent Spell":        {requiresSpellcasting:true},
  "Still Spell":         {requiresSpellcasting:true},
  "Heighten Spell":      {requiresSpellcasting:true},
  "Widen Spell":         {requiresSpellcasting:true},
  "Twin Spell":          {requiresSpellcasting:true},
  "Greater Spell Focus":  {feats:["Spell Focus"]},
  "Greater Spell Penetration":{feats:["Spell Penetration"]},
  "Spell Mastery":       {requiresClass:"Wizard", minClassLevel:1},
  "Natural Spell":       {wis:13, special:"Wild Shape ability (Druid 5+ or similar)"},
  // ── Item Creation ──────────────────────────────────────────────────────────
  "Craft Wondrous Item": {casterLevel:3},
  "Scribe Scroll":       {casterLevel:1},
  "Brew Potion":         {casterLevel:3},
  "Craft Magic Arms and Armor":{casterLevel:5},
  "Craft Rod":           {casterLevel:9},
  "Craft Staff":         {casterLevel:12},
  "Craft Wand":          {casterLevel:5},
  "Forge Ring":          {casterLevel:12},
  // ── Skill/level-based ──────────────────────────────────────────────────────
  "Acrobatic":           {},
  "Combat Casting":      {},
  "Leadership":          {minCharLevel:6},
  "Improved Familiar":   {requiresSpellcasting:true, casterLevel:3},
  "Practiced Spellcaster":{requiresSpellcasting:true},
  // ── Psionic ────────────────────────────────────────────────────────────────
  "Psionic Body":        {requiresPsionic:true},
  "Psionic Talent":      {requiresPsionic:true},
  "Psionic Meditation":  {requiresPsionic:true},
  "Chain Power":         {requiresPsionic:true},
  "Delay Power":         {requiresPsionic:true},
  "Fortify Power":       {requiresPsionic:true},
  "Burrowing Power":     {requiresPsionic:true},
  "Split Psionic Ray":   {requiresPsionic:true},
  // ── Greater/Improved chains ────────────────────────────────────────────────
  "Greater Cleave":      {bab:4, feats:["Cleave","Power Attack"]},
  "Greater Spell Focus":  {feats:["Spell Focus"]},
};

const FEATS_STACKABLE = new Set([
  "Toughness","Spell Focus","Greater Spell Focus","Exotic Weapon Proficiency",
  "Skill Focus","Rapid Reload","Weapon Focus","Weapon Specialization",
  "Greater Weapon Focus","Greater Weapon Specialization","Improved Critical",
  "Extra Smiting","Extra Turning","Extra Rage","Psionic Talent","Spell Mastery",
]);

const FEAT_CHOICES = {
  "Weapon Focus":          {prompt:"Choose a weapon:", options:"open", chainKey:"weapon"},
  "Weapon Specialization": {prompt:"Choose a weapon (must match a Weapon Focus you have):", options:"open", chainKey:"weapon"},
  "Greater Weapon Focus":  {prompt:"Choose a weapon (must match a Weapon Focus you have):", options:"open", chainKey:"weapon"},
  "Greater Weapon Specialization":{prompt:"Choose a weapon (must match Weapon Focus & Weapon Spec you have):", options:"open", chainKey:"weapon"},
  "Improved Critical":     {prompt:"Choose a weapon:", options:"open"},
  "Exotic Weapon Proficiency":{prompt:"Choose an exotic weapon:", options:"open"},
  "Skill Focus": {prompt:"Choose a skill:", options:["Appraise","Autohypnosis","Balance","Bluff","Climb","Concentration","Craft","Decipher Script","Diplomacy","Disable Device","Disguise","Escape Artist","Forgery","Gather Info","Handle Animal","Heal","Hide","Intimidate","Jump","Knowledge(Arcana)","Knowledge(Dungeoneering)","Knowledge(Geography)","Knowledge(History)","Knowledge(Local)","Knowledge(Nature)","Knowledge(Nobility)","Knowledge(Planes)","Knowledge(Psionics)","Knowledge(Religion)","Listen","Move Silently","Open Lock","Perform","Profession","Psicraft","Ride","Search","Sense Motive","Sleight of Hand","Spellcraft","Spot","Survival","Swim","Tumble","Use Magic Device","Use Psionic Device","Use Rope"]},
  "Spell Focus": {prompt:"Choose a school of magic:", options:["Abjuration","Conjuration","Divination","Enchantment","Evocation","Illusion","Necromancy","Transmutation","Universal"]},
  "Greater Spell Focus": {prompt:"Choose a school (must match a Spell Focus you have):", options:["Abjuration","Conjuration","Divination","Enchantment","Evocation","Illusion","Necromancy","Transmutation","Universal"]},
  "Rapid Reload": {prompt:"Choose crossbow type:", options:["Hand crossbow","Light crossbow","Heavy crossbow"]},
  "Spell Mastery": {prompt:"List spells mastered (comma-separated):", options:"open"},
};

// ─── CLASS PROFICIENCIES ──────────────────────────────────────────────────────
// Maps class name → array of {clsLvl, profs:[...]} granted at that class level.
// clsLvl:1 = granted when first class level is taken (char level varies).
// These appear as read-only granted proficiency entries in the feat tree.
const CLASS_PROFICIENCIES = {
  // ── PHB Base Classes ────────────────────────────────────────────────────────
  "Barbarian":      [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: Light Armor","Prof: Medium Armor","Prof: Shields"]}],
  "Bard":           [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Longsword","Prof: Rapier","Prof: Sap","Prof: Short Sword","Prof: Shortbow","Prof: Whip","Prof: Light Armor","Prof: Shields (except tower)"]}],
  "Cleric":         [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: All Armor","Prof: Shields"]}],
  "Druid":          [{clsLvl:1, profs:["Prof: Club","Prof: Dagger","Prof: Dart","Prof: Quarterstaff","Prof: Scimitar","Prof: Sickle","Prof: Short Spear","Prof: Sling","Prof: Spear","Prof: Light & Medium Non-Metal Armor","Prof: Wooden Shields"]}],
  "Fighter":        [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: All Armor","Prof: Shields (including tower)"]}],
  "Monk":           [{clsLvl:1, profs:["Prof: Club","Prof: Crossbow (light/heavy)","Prof: Dagger","Prof: Handaxe","Prof: Javelin","Prof: Kama","Prof: Nunchaku","Prof: Quarterstaff","Prof: Sai","Prof: Shuriken","Prof: Siangham","Prof: Sling"]}],
  "Paladin":        [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: All Armor","Prof: Shields"]}],
  "Ranger":         [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: Light Armor","Prof: Medium Armor","Prof: Shields"]}],
  "Rogue":          [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Hand Crossbow","Prof: Rapier","Prof: Sap","Prof: Short Sword","Prof: Shortbow","Prof: Light Armor"]}],
  "Sorcerer":       [{clsLvl:1, profs:["Prof: Simple Weapons"]}],
  "Wizard":         [{clsLvl:1, profs:["Prof: Club","Prof: Dagger","Prof: Heavy Crossbow","Prof: Light Crossbow","Prof: Quarterstaff"]}],
  // ── Complete Warrior ────────────────────────────────────────────────────────
  "Hexblade (base)":[{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: Light Armor","Prof: Medium Armor","Prof: Heavy Armor","Prof: Shields"]}],
  "Swashbuckler (base)":[{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: Light Armor"]}],
  "Samurai":        [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: All Armor","Prof: Shields"]}],
  // ── Complete Adventurer ────────────────────────────────────────────────────
  "Scout":          [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Light Armor","Prof: Shields"]}],
  "Ninja":          [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Kama","Prof: Nunchaku","Prof: Sai","Prof: Shuriken","Prof: Siangham","Prof: Shortbow"]}],
  "Spellthief":     [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Light Armor"]}],
  // ── Complete Arcane ─────────────────────────────────────────────────────────
  "Warmage":        [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Light Armor (no arcane failure)"]}],
  "Wu Jen":         [{clsLvl:1, profs:["Prof: Simple Weapons"]}],
  "Warlock":        [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Light Armor"]}],
  "Sorcerer (Battle)":[{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: Light Armor (no arcane failure)"]}],
  // ── Complete Divine ─────────────────────────────────────────────────────────
  "Shugenja":       [{clsLvl:1, profs:["Prof: Simple Weapons"]}],
  "Spirit Shaman":  [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Light Armor","Prof: Medium Armor","Prof: Shields"]}],
  // ── Complete Psionic / XPH ─────────────────────────────────────────────────
  "Psion":          [{clsLvl:1, profs:["Prof: Club","Prof: Dagger","Prof: Heavy Crossbow","Prof: Light Crossbow","Prof: Quarterstaff","Prof: Shortspear"]}],
  "Psychic Warrior":[{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: All Armor","Prof: Shields"]}],
  "Wilder":         [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Light Armor","Prof: Medium Armor"]}],
  "Soulknife":      [{clsLvl:1, profs:["Prof: All Simple Weapons","Prof: Mind Blade","Prof: Light Armor","Prof: Medium Armor"]}],
  "Ardent":         [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Light Armor","Prof: Medium Armor"]}],
  "Divine Mind":    [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: All Armor","Prof: Shields"]}],
  "Lurk":           [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Light Armor"]}],
  "Erudite":        [{clsLvl:1, profs:["Prof: Club","Prof: Dagger","Prof: Heavy Crossbow","Prof: Light Crossbow","Prof: Quarterstaff","Prof: Shortspear"]}],
  // ── Miniatures Handbook ────────────────────────────────────────────────────
  "Healer":         [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Light Armor"]}],
  "Marshal":        [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: All Armor","Prof: Shields"]}],
  // ── Heroes of Horror ───────────────────────────────────────────────────────
  "Dread Necromancer":[{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Light Armor"]}],
  // ── Dungeonscape ────────────────────────────────────────────────────────────
  "Factotum":       [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: Light Armor"]}],
  // ── Magic of Incarnum ──────────────────────────────────────────────────────
  "Incarnate":      [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Light Armor","Prof: Medium Armor","Prof: Shields"]}],
  "Soulborn":       [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: All Armor","Prof: Shields"]}],
  "Totemist":       [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Light Armor","Prof: Medium Armor"]}],
  // ── Tome of Magic ──────────────────────────────────────────────────────────
  "Binder":         [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Light Armor","Prof: Medium Armor","Prof: Shields"]}],
  "Shadowcaster":   [{clsLvl:1, profs:["Prof: Simple Weapons"]}],
  "Truenamer":      [{clsLvl:1, profs:["Prof: Simple Weapons"]}],
  // ── Tome of Battle ─────────────────────────────────────────────────────────
  "Crusader":       [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: All Armor","Prof: Shields"]}],
  "Swordsage":      [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons (except heavy blades)","Prof: Light Armor"]}],
  "Warblade":       [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: All Armor","Prof: Shields (except tower)"]}],
  // ── PHB II / Dragon Shaman etc ─────────────────────────────────────────────
  "Dragon Shaman":  [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: All Armor","Prof: Shields"]}],
  "Knight":         [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: All Armor","Prof: Shields"]}],
  // ── Eberron ─────────────────────────────────────────────────────────────────
  "Artificer":      [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Light Armor","Prof: Medium Armor","Prof: Shields"]}],
  // ── Unearthed Arcana ───────────────────────────────────────────────────────
  "Cavalier":       [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: All Armor","Prof: Shields"]}],
  "Barbarian (Whirling Frenzy)": [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: Light Armor","Prof: Medium Armor","Prof: Shields"]}],
  "Barbarian (Totem)":           [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: Light Armor","Prof: Medium Armor","Prof: Shields"]}],
  "Barbarian (Spirit Totem)":    [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: Light Armor","Prof: Medium Armor","Prof: Shields"]}],
  "Barbarian (Lion Totem)":      [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: Light Armor","Prof: Medium Armor","Prof: Shields"]}],
  "Barbarian (Wolf Totem)":      [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: Light Armor","Prof: Medium Armor","Prof: Shields"]}],
  "Barbarian (Bear Totem)":      [{clsLvl:1, profs:["Prof: Simple Weapons","Prof: Martial Weapons","Prof: Light Armor","Prof: Medium Armor","Prof: Shields"]}],
};

// ─── RACIAL PROFICIENCIES ─────────────────────────────────────────────────────
// Maps race name → array of bonus weapon/armor proficiencies granted at character level 1.
const RACE_PROFICIENCIES = {
  "Elf, High":         ["Prof: Longsword (racial)","Prof: Rapier (racial)","Prof: Longbow (racial)","Prof: Shortbow (racial)"],
  "Elf, Grey":         ["Prof: Longsword (racial)","Prof: Rapier (racial)","Prof: Longbow (racial)","Prof: Shortbow (racial)"],
  "Elf, Wood":         ["Prof: Longsword (racial)","Prof: Rapier (racial)","Prof: Longbow (racial)","Prof: Shortbow (racial)"],
  "Elf, Wild":         ["Prof: Longsword (racial)","Prof: Rapier (racial)","Prof: Longbow (racial)","Prof: Shortbow (racial)"],
  "Elf, Sun (Gold)":   ["Prof: Longsword (racial)","Prof: Rapier (racial)","Prof: Longbow (racial)","Prof: Shortbow (racial)"],
  "Elf, Moon (Silver)":["Prof: Longsword (racial)","Prof: Rapier (racial)","Prof: Longbow (racial)","Prof: Shortbow (racial)"],
  "Elf, Sea":          ["Prof: Longsword (racial)","Prof: Rapier (racial)","Prof: Longbow (racial)","Prof: Shortbow (racial)"],
  "Elf, Snow":         ["Prof: Longsword (racial)","Prof: Rapier (racial)","Prof: Longbow (racial)","Prof: Shortbow (racial)"],
  "Elf, Valley":       ["Prof: Longsword (racial)","Prof: Rapier (racial)","Prof: Longbow (racial)","Prof: Shortbow (racial)"],
  "Elf, Aquatic":      ["Prof: Longsword (racial)","Prof: Rapier (racial)","Prof: Longbow (racial)","Prof: Shortbow (racial)"],
  "Drow":              ["Prof: Hand Crossbow (racial)","Prof: Rapier (racial)","Prof: Short Sword (racial)"],
  "Dwarf, Mountain":   ["Prof: Dwarven Waraxe (racial)","Prof: Dwarven Urgrosh (racial)"],
  "Dwarf, Hill":       ["Prof: Dwarven Waraxe (racial)","Prof: Dwarven Urgrosh (racial)"],
  "Dwarf, Deep":       ["Prof: Dwarven Waraxe (racial)","Prof: Dwarven Urgrosh (racial)"],
  "Dwarf, Duergar":    ["Prof: Dwarven Waraxe (racial)","Prof: Dwarven Urgrosh (racial)"],
  "Dwarf, Gold":       ["Prof: Dwarven Waraxe (racial)","Prof: Dwarven Urgrosh (racial)"],
  "Gnome":             ["Prof: Gnome Hooked Hammer (racial)"],
  "Gnome, Deep (Svirfneblin)": ["Prof: Light Hammer (racial)","Prof: Pick, Heavy (racial)","Prof: Pick, Light (racial)"],
  "Gnome, Forest":     ["Prof: Gnome Hooked Hammer (racial)"],
  "Halfling, Lightfoot":["Prof: Throwing (racial — +1 attack throws)"],
  "Halfling, Deep":    ["Prof: Throwing (racial — +1 attack throws)"],
  "Halfling, Tallfellow":["Prof: Throwing (racial — +1 attack throws)"],
  "Orc":               ["Prof: Falchion (racial)","Prof: Greataxe (racial)"],
  "Half-Orc":          ["Prof: Falchion (racial)","Prof: Greataxe (racial)"],
  "Githyanki":         ["Prof: Greatsword (racial)","Prof: Silver Sword (racial)"],
  "Raptoran":          ["Prof: Longbow (racial)","Prof: Shortbow (racial)","Prof: Composite Longbow (racial)","Prof: Composite Shortbow (racial)"],
};

// ─── CLASS STYLE TRACKS (Tier 1) ──────────────────────────────────────────────
// Classes that grant specific feats automatically at specific class levels
// based on a once-made style/path/discipline choice.
// Format: {label, choices: {choiceName: [{clsLvl, feat}]}}
const CLASS_STYLE_TRACKS = {

  // ── Ranger & Variants ──────────────────────────────────────────────────────
  "Ranger": {
    label:"Combat Style",
    choices:{
      "Archery":           [{clsLvl:2,feat:"Rapid Shot"},{clsLvl:6,feat:"Manyshot"},{clsLvl:11,feat:"Improved Precise Shot"}],
      "Two-Weapon Combat": [{clsLvl:2,feat:"Two-Weapon Fighting"},{clsLvl:6,feat:"Improved Two-Weapon Fighting"},{clsLvl:11,feat:"Greater Two-Weapon Fighting"}],
    }
  },
  "Ranger (Wildshape)": {
    label:"Combat Style",
    choices:{
      "Archery":           [{clsLvl:2,feat:"Rapid Shot"},{clsLvl:6,feat:"Manyshot"},{clsLvl:11,feat:"Improved Precise Shot"}],
      "Two-Weapon Combat": [{clsLvl:2,feat:"Two-Weapon Fighting"},{clsLvl:6,feat:"Improved Two-Weapon Fighting"},{clsLvl:11,feat:"Greater Two-Weapon Fighting"}],
    }
  },
  "Ranger (Skirmisher)": {
    label:"Combat Style",
    choices:{
      "Archery":           [{clsLvl:2,feat:"Rapid Shot"},{clsLvl:6,feat:"Manyshot"},{clsLvl:11,feat:"Improved Precise Shot"}],
      "Two-Weapon Combat": [{clsLvl:2,feat:"Two-Weapon Fighting"},{clsLvl:6,feat:"Improved Two-Weapon Fighting"},{clsLvl:11,feat:"Greater Two-Weapon Fighting"}],
    }
  },
  "Ranger (Arcane Hunter)": {
    label:"Combat Style",
    choices:{
      "Archery":           [{clsLvl:2,feat:"Rapid Shot"},{clsLvl:6,feat:"Manyshot"},{clsLvl:11,feat:"Improved Precise Shot"}],
      "Two-Weapon Combat": [{clsLvl:2,feat:"Two-Weapon Fighting"},{clsLvl:6,feat:"Improved Two-Weapon Fighting"},{clsLvl:11,feat:"Greater Two-Weapon Fighting"}],
    }
  },
  "Nature's Warrior": {
    label:"Combat Style",
    choices:{
      "Archery":           [{clsLvl:2,feat:"Rapid Shot"},{clsLvl:6,feat:"Manyshot"}],
      "Two-Weapon Combat": [{clsLvl:2,feat:"Two-Weapon Fighting"},{clsLvl:6,feat:"Improved Two-Weapon Fighting"}],
    }
  },

  // ── Monk (Fighting Styles) ─────────────────────────────────────────────────
  // Each style grants 2-3 feats at monk class levels 1, 2, and 6
  "Monk (Fighting Styles)": {
    label:"Fighting Style",
    choices:{
      "Cobra Strike":        [{clsLvl:1,feat:"Improved Unarmed Strike"},{clsLvl:2,feat:"Weapon Finesse"},{clsLvl:6,feat:"Improved Grapple"}],
      "Denning Dog":         [{clsLvl:1,feat:"Improved Unarmed Strike"},{clsLvl:2,feat:"Combat Reflexes"},{clsLvl:6,feat:"Stand Still"}],
      "Falling Star":        [{clsLvl:1,feat:"Improved Unarmed Strike"},{clsLvl:2,feat:"Stunning Fist"},{clsLvl:6,feat:"Deflect Arrows"}],
      "Invisible Eye":       [{clsLvl:1,feat:"Improved Unarmed Strike"},{clsLvl:2,feat:"Blind-Fight"},{clsLvl:6,feat:"Combat Expertise"}],
      "Overwhelming Assault":[{clsLvl:1,feat:"Improved Unarmed Strike"},{clsLvl:2,feat:"Power Attack"},{clsLvl:6,feat:"Improved Bull Rush"}],
      "Sleeping Tiger":      [{clsLvl:1,feat:"Improved Unarmed Strike"},{clsLvl:2,feat:"Combat Expertise"},{clsLvl:6,feat:"Improved Feint"}],
    }
  },

  // ── Psychic Warrior (Warrior's Path) ──────────────────────────────────────
  // Paths from Complete Psionic — each grants bonus feats/powers at cls 2/6/11
  "Psychic Warrior": {
    label:"Warrior's Path",
    choices:{
      "Path of the Ascetic":  [{clsLvl:2,feat:"Improved Unarmed Strike"},{clsLvl:6,feat:"Combat Expertise"},{clsLvl:11,feat:"Deflect Arrows"}],
      "Path of the Blade":    [{clsLvl:2,feat:"Weapon Focus"},{clsLvl:6,feat:"Weapon Specialization"},{clsLvl:11,feat:"Greater Weapon Focus"}],
      "Path of the Bow":      [{clsLvl:2,feat:"Point Blank Shot"},{clsLvl:6,feat:"Precise Shot"},{clsLvl:11,feat:"Improved Precise Shot"}],
      "Path of the Fury":     [{clsLvl:2,feat:"Power Attack"},{clsLvl:6,feat:"Cleave"},{clsLvl:11,feat:"Great Cleave"}],
      "Path of the Shield":   [{clsLvl:2,feat:"Shield Proficiency"},{clsLvl:6,feat:"Shield Specialization"},{clsLvl:11,feat:"Improved Shield Bash"}],
      "Path of the Skirmisher":[{clsLvl:2,feat:"Dodge"},{clsLvl:6,feat:"Mobility"},{clsLvl:11,feat:"Spring Attack"}],
      "Path of the Stalker":  [{clsLvl:2,feat:"Track"},{clsLvl:6,feat:"Improved Initiative"},{clsLvl:11,feat:"Combat Reflexes"}],
    }
  },
  "Psychic Warrior (Meditant)": {
    label:"Warrior's Path",
    choices:{
      "Path of the Ascetic":  [{clsLvl:2,feat:"Improved Unarmed Strike"},{clsLvl:6,feat:"Combat Expertise"},{clsLvl:11,feat:"Deflect Arrows"}],
      "Path of the Blade":    [{clsLvl:2,feat:"Weapon Focus"},{clsLvl:6,feat:"Weapon Specialization"},{clsLvl:11,feat:"Greater Weapon Focus"}],
      "Path of the Bow":      [{clsLvl:2,feat:"Point Blank Shot"},{clsLvl:6,feat:"Precise Shot"},{clsLvl:11,feat:"Improved Precise Shot"}],
      "Path of the Fury":     [{clsLvl:2,feat:"Power Attack"},{clsLvl:6,feat:"Cleave"},{clsLvl:11,feat:"Great Cleave"}],
      "Path of the Shield":   [{clsLvl:2,feat:"Shield Proficiency"},{clsLvl:6,feat:"Shield Specialization"},{clsLvl:11,feat:"Improved Shield Bash"}],
      "Path of the Skirmisher":[{clsLvl:2,feat:"Dodge"},{clsLvl:6,feat:"Mobility"},{clsLvl:11,feat:"Spring Attack"}],
    }
  },

  // ── Swordsage (Discipline Focus) ──────────────────────────────────────────
  // Choose one discipline — bonus feats at cls 1, 4, 8, 12, 16 (Weapon Focus chain)
  "Swordsage": {
    label:"Discipline Focus",
    choices:{
      "Desert Wind":  [{clsLvl:1,feat:"Weapon Focus (scimitar)"},{clsLvl:4,feat:"Desert Wind Mastery"},{clsLvl:8,feat:"Weapon Specialization (scimitar)"}],
      "Diamond Mind": [{clsLvl:1,feat:"Weapon Focus (rapier)"},{clsLvl:4,feat:"Diamond Mind Mastery"},{clsLvl:8,feat:"Weapon Specialization (rapier)"}],
      "Setting Sun":  [{clsLvl:1,feat:"Improved Unarmed Strike"},{clsLvl:4,feat:"Setting Sun Mastery"},{clsLvl:8,feat:"Improved Trip"}],
      "Shadow Hand":  [{clsLvl:1,feat:"Weapon Focus (short sword)"},{clsLvl:4,feat:"Shadow Hand Mastery"},{clsLvl:8,feat:"Weapon Specialization (short sword)"}],
      "Stone Dragon": [{clsLvl:1,feat:"Weapon Focus (greatsword)"},{clsLvl:4,feat:"Stone Dragon Mastery"},{clsLvl:8,feat:"Weapon Specialization (greatsword)"}],
      "Tiger Claw":   [{clsLvl:1,feat:"Improved Unarmed Strike"},{clsLvl:4,feat:"Tiger Claw Mastery"},{clsLvl:8,feat:"Two-Weapon Fighting"}],
    }
  },
};

// ─── CLASS STYLE INFO (Tier 2) ────────────────────────────────────────────────
// Pick-once choices that affect class description / sheet display but don't
// auto-grant feats. Stored in S.classStyleChoices for sheet printing.
// Format: {label, choices:[...strings], description (optional)}
const CLASS_STYLE_INFO = {

  // ── Psion Discipline ───────────────────────────────────────────────────────
  "Psion": {
    label:"Psionic Discipline",
    choices:["Egoist (Psychometabolism)","Kineticist (Psychokinesis)","Nomad (Psychoportation)","Seer (Clairsentience)","Shaper (Metacreativity)","Telepath (Telepathy)"],
    description:"Your discipline determines which powers are class powers for you, granting you one extra power known per level from your discipline's list.",
  },
  "Erudite": {
    label:"Psionic Discipline",
    choices:["Egoist (Psychometabolism)","Kineticist (Psychokinesis)","Nomad (Psychoportation)","Seer (Clairsentience)","Shaper (Metacreativity)","Telepath (Telepathy)"],
    description:"Your starting discipline determines your initial bonus power and favored power list.",
  },

  // ── Ardent Mantles ────────────────────────────────────────────────────────
  "Ardent": {
    label:"Mantles (choose 2)",
    choices:["Freedom","Good & Evil","Justice & Tyranny","Life & Death","Light & Darkness","Mental Power","Natural World","Pain & Suffering","Patience & Time","Physical Power","Sloth & War"],
    multiSelect:2,
    description:"Your two chosen mantles determine which psionic powers are available to you and grant you their associated granted abilities.",
  },

  // ── Divine Mind Mantles ───────────────────────────────────────────────────
  "Divine Mind": {
    label:"Mantles (choose 2)",
    choices:["Freedom","Good & Evil","Justice & Tyranny","Life & Death","Light & Darkness","Mental Power","Natural World","Pain & Suffering","Patience & Time","Physical Power","Sloth & War"],
    multiSelect:2,
    description:"Your two chosen mantles determine your Psionic Aura effects and which powers you have access to.",
  },

  // ── Barbarian (Totem) ─────────────────────────────────────────────────────
  "Barbarian (Totem)": {
    label:"Totem Animal",
    choices:["Bear","Eagle","Serpent","Wolf"],
    description:"Your totem animal determines which rage benefit is replaced by a totem power, and the nature of your Improved and Greater Totem abilities.",
  },
  "Barbarian (Spirit Totem)": {
    label:"Spirit Totem",
    choices:["Bear Spirit","Eagle Spirit","Shark Spirit","Snake Spirit","Wolf Spirit"],
    description:"Your spirit totem grants a bonus against a specific creature type while raging, and determines your Totemic Summons and Spiritual Connection abilities.",
  },

  // ── Dragon Shaman ─────────────────────────────────────────────────────────
  "Dragon Shaman": {
    label:"Draconic Aura / Dragon Type",
    choices:["Black (acid, swamp)","Blue (electricity, desert)","Green (acid, forest)","Red (fire, mountain)","White (cold, arctic)","Brass (fire, desert)","Bronze (electricity, coastal)","Copper (acid, hills)","Gold (fire, plains)","Silver (cold, mountain)"],
    description:"Your dragon type determines your energy type for breath weapon, your draconic aura options, and your energy resistance as you level. You select auras from the standard list, but your energy type is fixed by this choice.",
  },

  // ── Marshal Auras ─────────────────────────────────────────────────────────
  "Marshal": {
    label:"Minor & Major Aura Selections",
    choices:["Motivate Dexterity","Motivate Strength","Motivate Constitution","Motivate Wisdom","Motivate Charisma","Motivate Attack","Motivate Damage","Resilient Troops","Steady Advance","Motivate Care","Inspire Recklessness","Master of Opportunity","Master of Tactics","Watchful Eye","Hardy Soldiers"],
    multiSelect:999, // pick freely as gained
    description:"You gain Minor Auras at levels 1 and 2, and Major Auras at levels 4, 8, and 12. Each aura you select grants allies within 60 ft a bonus — note your selections here for sheet reference.",
  },

  // ── Cleric Domains ────────────────────────────────────────────────────────
  "Cleric": {
    label:"Domains (choose 2)",
    choices:["Air","Animal","Chaos","Death","Destruction","Earth","Evil","Fire","Good","Healing","Knowledge","Law","Luck","Magic","Plant","Protection","Strength","Sun","Travel","Trickery","War","Water","Celerity","Community","Competition","Craft","Darkness","Domination","Drow","Dwarf","Elf","Envy","Fate","Fury","Gnome","Glory","Gluttony","Greed","Halfling","Hatred","Illusion","Liberation","Lust","Madness","Mentalism","Metal","Mind","Nobility","Ocean","Orc","Pact","Portal","Pride","Purification","Renewal","Repose","Retribution","Rune","Scalykind","Sloth","Slime","Spider","Storm","Suffering","Summoner","Time","Tyranny","Undead","Wrath"],
    multiSelect:2,
    description:"Your two chosen domains grant you domain spell slots each day (filled with domain spells), domain powers, and access to your deity's domain spell list.",
  },
  "Cleric (Spontaneous Domain Casting)": {
    label:"Domains (choose 2)",
    choices:["Air","Animal","Chaos","Death","Destruction","Earth","Evil","Fire","Good","Healing","Knowledge","Law","Luck","Magic","Plant","Protection","Strength","Sun","Travel","Trickery","War","Water"],
    multiSelect:2,
    description:"As the standard Cleric, but you spontaneously cast domain spells instead of converting to cure/inflict.",
  },
  "Cleric (Undead Lord)": {
    label:"Domains (choose 2)",
    choices:["Death","Evil","Undead","Darkness","Destruction","Necromancy"],
    multiSelect:2,
    description:"Your domains are restricted to those appropriate for an Undead Lord — typically Death, Evil, Undead, or similar dark domains.",
  },

  // ── Tier 4 — Informational / Narrative Choices ────────────────────────────
  // These shape the character's description and sheet but grant no feats.

  "Sorcerer (Focused Specialist)": {
    label:"Prohibited Schools (choose 2)",
    choices:["Abjuration","Conjuration","Divination","Enchantment","Evocation","Illusion","Necromancy","Transmutation"],
    multiSelect:2,
    description:"You may not cast spells from your two prohibited schools. Choose wisely — this is permanent. Your specialist school is implied by which schools you do NOT prohibit.",
  },

  "Half-Elf Paragon": {
    label:"Divided Ancestry (at 2nd level)",
    choices:["Elf side — gain low-light vision improvement, +1 Listen/Search/Spot, elven weapon familiarity",
             "Human side — gain bonus feat, +2 skill points per remaining level, extra skill as class skill"],
    description:"At 2nd level you choose which ancestral side to embrace. This determines your bonus abilities for levels 2 and 3 of this paragon class.",
  },

  "Human Paragon": {
    label:"Adaptive Learning — Permanent Class Skill",
    choices:["Appraise","Balance","Bluff","Climb","Concentration","Craft","Decipher Script","Diplomacy","Disable Device",
             "Disguise","Escape Artist","Forgery","Gather Info","Handle Animal","Heal","Hide","Intimidate","Jump",
             "Knowledge(Arcana)","Knowledge(Architecture)","Knowledge(Dungeoneering)","Knowledge(Geography)",
             "Knowledge(History)","Knowledge(Local)","Knowledge(Nature)","Knowledge(Nobility)","Knowledge(Planes)",
             "Knowledge(Religion)","Listen","Move Silently","Open Lock","Perform","Profession","Ride","Search",
             "Sense Motive","Sleight of Hand","Spellcraft","Spot","Survival","Swim","Tumble","Use Magic Device","Use Rope"],
    description:"At 1st level of Human Paragon, choose any one skill. That skill becomes a permanent class skill for you regardless of your other classes.",
  },

  "Druid (Shapeshift)": {
    label:"Shapeshift Animal Forms",
    choices:["Bear","Boar","Crocodile","Dire Wolf","Leopard","Lion","Shark","Snake","Tiger","Wolf"],
    multiSelect:999,
    description:"Note which animal forms you have access to. As a Shapeshift Druid you use a swift action to assume fixed stat-block forms rather than standard Wild Shape — mark the forms available at your druid level.",
  },

  "Shifter Paragon": {
    label:"Enhanced Shifting Trait",
    choices:["Beasthide (Natural Armor)","Cliffwalk (Climb speed)","Dreamsight (speak with animals)","Gorebrute (gore attack)","Longstride (speed increase)","Longtooth (bite attack)","Razorclaw (claw attacks)","Swiftwing (glide/fly)","Truedive (swim speed)","Wildshape (partial wild shape)"],
    description:"Your paragon levels enhance one of your shifter traits. The chosen trait's bonuses improve by +1 each paragon level, and your shifting duration increases when using that trait.",
  },

  "Bear Warrior": {
    label:"Bear Form Progression",
    choices:["Brown Bear (Large: +16 STR, +2 CON, natural armor +5)","Dire Bear (Large: +20 STR, +4 CON, natural armor +7)","Polar Bear (Large: +14 STR, +2 CON, natural armor +4, cold resistance 5)"],
    description:"At 5th class level you choose which bear form becomes your Greater Bear Form. Your initial Bear Form (black bear, levels 1-4) is the same regardless of this choice.",
  },

  "Animal Lord": {
    label:"Animal Type",
    choices:["Bear Lord","Bird Lord","Cat Lord","Crocodile Lord","Rat Lord","Serpent Lord","Shark Lord","Toad Lord","Wolf Lord"],
    description:"Your animal type determines your totem animal, which wild empathy creatures you affect at double normal range, and the nature of your Animal Speech, Summon Animals, and Animal Body abilities.",
  },

  "Wildshaper": {
    label:"Wildshape Focus",
    choices:["Animal Forms","Elemental Forms","Plant Forms","Magical Beast Forms"],
    description:"Note your primary wildshape focus. This affects which advanced forms you prioritize as you gain access to Elemental Wild Shape, Plant Wild Shape, and Magical Beast Shape.",
  },

  "Totemist": {
    label:"Totem Chakra Focus",
    choices:["Totem of the Bear","Totem of the Claw","Totem of the Fang","Totem of the Hunter","Totem of the Scales","Totem of the Sky","Totem of the Stone"],
    description:"Note your primary totem chakra binding focus for sheet reference. Your totem chakra bind grants special abilities based on which soulmeld is bound there.",
  },

  "Factotum": {
    label:"Inspiration Focus",
    choices:["Arcane Dilettante (primary)","Cunning Insight (primary)","Brains Over Brawn (primary)","Trapfinding (primary)"],
    description:"Note which Factotum ability you lean on most — for sheet reference and roleplay purposes. All abilities are available to you, but your inspiration point allocation tends to favor one approach.",
  },

  "Binder": {
    label:"Bound Vestiges (note current bindings)",
    choices:["Amon","Andromalius","Aym","Buer","Dahlver-Nar","Dantalion","Eligor","Focalor","Geryon","Haagenti","Ipos","Leraje","Marchosias","Malphas","Naberius","Paimon","Ronove","Savnok","Tenebrous","Zceryll"],
    multiSelect:999,
    description:"Note which vestiges you commonly bind for reference. Your available vestiges depend on your Binder level and your Binding check result — this is for sheet annotation only.",
  },

  "Crusader": {
    label:"Discipline Focus",
    choices:["Devoted Spirit","Stone Dragon","White Raven"],
    description:"Your three disciplines are fixed (Devoted Spirit, Stone Dragon, White Raven), but note your primary focus for determining which maneuvers you prioritize readying.",
  },

  "Warblade": {
    label:"Discipline Focus",
    choices:["Diamond Mind","Iron Heart","Stone Dragon","Tiger Claw","White Raven"],
    description:"Your five disciplines are fixed, but note your primary focus for sheet reference and maneuver prioritization.",
  },

  "Dread Necromancer": {
    label:"Lich Transformation Path",
    choices:["Standard Lich (INT-based phylactery)","Necropolite (Libris Mortis variant — cheaper but lesser abilities)"],
    description:"At 20th level your Lich Transformation is complete. Note which path you follow for sheet reference — this determines your phylactery type and post-transformation abilities.",
  },
};
