import React from 'react'
import { RollAbilitiesStep } from '../components/wizard/RollAbilitiesStep'
import { AssignAbilitiesStep } from '../components/wizard/AssignAbilitiesStep'
import { AbilityAllocator } from '../components/wizard/AbilityAllocator'
import { AbilitiesStep } from '../components/wizard/AbilitiesStep'
import { RaceStep } from '../components/wizard/RaceStep'
import { ClassStep } from '../components/wizard/ClassStep'
import { FeatsStep } from '../components/wizard/FeatsStep'
import { FeatStep } from '../components/wizard/FeatStep'
import { SkillAllocator } from '../components/wizard/SkillAllocator'
import { SkillsStep } from '../components/wizard/SkillsStep'
import { StartingPackageStep } from '../components/wizard/StartingPackageStep'
import { RacialClassFeaturesStep } from '../components/wizard/RacialClassFeaturesStep'
import { CombatNumbersStep } from '../components/wizard/CombatNumbersStep'
import { EquipmentAllocator } from '../components/wizard/EquipmentAllocator'
import { DetailsStep } from '../components/wizard/DetailsStep'
import { DescriptionStep } from '../components/wizard/DescriptionStep'
import { TextForm } from '../components/wizard/TextForm'
import { NarrativeBlock } from '../components/wizard/NarrativeBlock'
import { NameStep } from '../components/wizard/NameStep'
import { ReviewStep } from '../components/wizard/ReviewStep'
import { AlignmentGrid } from '../components/wizard/AlignmentGrid'
import { ColorPicker, EYE_COLORS } from '../components/wizard/ColorPicker'
import { DeitySelector } from '../components/wizard/DeitySelector'
import { AgePicker } from '../components/wizard/AgePicker'
import { EntitySelector } from '../components/wizard/EntitySelector'
import type { Entity } from '../lib/types'

export interface RegistryEntry {
  label: string
  component: React.ComponentType<any>
  defaultProps: Record<string, unknown>
}

// Minimal stub entities used across multiple fixtures
const STUB_RACE: Entity = {
  id: 'srd:races:elf',
  entity_type: 'race',
  source_pack: 'srd-3.5e',
  tags: ['core'],
  mdx_body: '',
  properties: {
    name: 'Elf',
    description: 'Graceful and long-lived.',
    traits: ['Low-Light Vision', 'Elven Immunity', 'Keen Senses'],
    ecl: 0,
    age: [110, 120, 175, 350],
  },
}

const STUB_CLASS: Entity = {
  id: 'srd:classes:fighter',
  entity_type: 'class',
  source_pack: 'srd-3.5e',
  tags: ['core'],
  mdx_body: '',
  properties: {
    name: 'Fighter',
    description: 'Master of martial combat.',
    hd: 10,
    bab: 'full',
    fort: 'good',
    ref: 'poor',
    will: 'poor',
    features: ['Bonus Feat', 'Bonus Feat (2nd)'],
    skill_points: 2,
    starting_gold: 150,
  },
}

const STUB_FEAT: Entity = {
  id: 'srd:feats:power-attack',
  entity_type: 'feat',
  source_pack: 'srd-3.5e',
  tags: ['combat'],
  mdx_body: '',
  properties: {
    name: 'Power Attack',
    description: 'Trade attack bonus for damage.',
    prerequisites: ['STR 13'],
  },
}

const STUB_ABILITIES: Record<string, number> = {
  strength: 15,
  dexterity: 14,
  constitution: 13,
  intelligence: 12,
  wisdom: 10,
  charisma: 8,
}

export const componentRegistry: Record<string, RegistryEntry> = {
  // NOTE: on* props are included as `undefined` so the playground can wrap them.
  // The ComponentPlayground scans all keys starting with "on" and intercepts them.
  'roll-abilities': {
    label: 'RollAbilitiesStep',
    component: RollAbilitiesStep,
    defaultProps: {
      rolledSets: [[15, 14, 13, 12, 10, 8], [16, 13, 12, 11, 10, 9]],
      abilityMethod: 'roll',
      onRollAbilities: undefined,
      onStandardArray: undefined,
      onPointBuy: undefined,
      onManualEntry: undefined,
    },
  },
  'assign-abilities': {
    label: 'AssignAbilitiesStep',
    component: AssignAbilitiesStep,
    defaultProps: {
      abilities: STUB_ABILITIES,
      abilityMethod: 'array',
      pointBuyRemaining: 27,
      selectedClass: STUB_CLASS,
      unlocked: false,
      onRollAbilities: undefined,
      onStandardArray: undefined,
      onPointBuy: undefined,
      onManualEntry: undefined,
      onAbilityPointBuy: undefined,
      onAbilityManualChange: undefined,
    },
  },
  'ability-allocator': {
    label: 'AbilityAllocator',
    component: AbilityAllocator,
    defaultProps: {
      config: { mode: 'generate', show_racial_bonuses: false },
      rolledSets: [[15, 14, 13, 12, 10, 8]],
      abilityMethod: 'roll',
      pointBuyRemaining: 27,
      abilities: STUB_ABILITIES,
      selectedClass: STUB_CLASS,
      unlocked: false,
      onRollAbilities: undefined,
      onStandardArray: undefined,
      onPointBuy: undefined,
      onManualEntry: undefined,
      onAbilityPointBuy: undefined,
      onAbilityManualChange: undefined,
    },
  },
  'abilities-step': {
    label: 'AbilitiesStep',
    component: AbilitiesStep,
    defaultProps: {
      abilities: STUB_ABILITIES,
      abilityMethod: 'array',
      pointBuyRemaining: 27,
      selectedClass: STUB_CLASS,
      onRollAbilities: undefined,
      onStandardArray: undefined,
      onPointBuy: undefined,
      onManualEntry: undefined,
      onAbilityPointBuy: undefined,
      onAbilityManualChange: undefined,
      onAssignAbilities: undefined,
      onBack: undefined,
    },
  },
  'race': {
    label: 'RaceStep',
    component: RaceStep,
    defaultProps: {
      races: [STUB_RACE, { ...STUB_RACE, id: 'srd:races:human', properties: { ...STUB_RACE.properties, name: 'Human', description: 'Versatile and ambitious.', traits: ['Bonus Feat', 'Bonus Skill Points'] } }],
      selectedRace: null,
      onSelectRace: undefined,
    },
  },
  'class': {
    label: 'ClassStep',
    component: ClassStep,
    defaultProps: {
      classes: [STUB_CLASS, { ...STUB_CLASS, id: 'srd:classes:rogue', properties: { ...STUB_CLASS.properties, name: 'Rogue', hd: 6, bab: 'medium' } }],
      selectedClass: null,
      selectedClassB: null,
      isGestalt: false,
      onToggleGestalt: undefined,
      onSelectClass: undefined,
      onContinue: undefined,
      onBack: undefined,
    },
  },
  'feats-step': {
    label: 'FeatsStep',
    component: FeatsStep,
    defaultProps: {
      availableFeats: [STUB_FEAT, { ...STUB_FEAT, id: 'srd:feats:weapon-focus', properties: { ...STUB_FEAT.properties, name: 'Weapon Focus', description: 'Bonus to attack with one weapon.' } }],
      selectedFeats: [],
      featSlotsRemaining: 1,
      onSelectFeat: undefined,
      onContinue: undefined,
      onBack: undefined,
    },
  },
  'feat-step': {
    label: 'FeatStep',
    component: FeatStep,
    defaultProps: {
      availableFeats: [STUB_FEAT, { ...STUB_FEAT, id: 'srd:feats:weapon-focus', properties: { ...STUB_FEAT.properties, name: 'Weapon Focus', description: 'Bonus to attack with one weapon.' } }],
      selectedFeats: [],
      featSlotsRemaining: 1,
      onSelectFeat: undefined,
    },
  },
  'skill-allocator': {
    label: 'SkillAllocator',
    component: SkillAllocator,
    defaultProps: {
      config: { skills_ref: 'srd:skills' },
      abilities: STUB_ABILITIES,
      skillAllocations: {},
      classSkillNames: ['Climb', 'Jump', 'Swim', 'Intimidate'],
      skillPointsRemaining: 8,
      onAllocateSkill: undefined,
    },
  },
  'skills-step': {
    label: 'SkillsStep',
    component: SkillsStep,
    defaultProps: {
      abilities: STUB_ABILITIES,
      skillAllocations: {},
      classSkillNames: ['Climb', 'Jump', 'Swim', 'Intimidate'],
      skillPointsRemaining: 8,
      onAllocateSkill: undefined,
      onContinue: undefined,
      onBack: undefined,
    },
  },
  'starting-package': {
    label: 'StartingPackageStep',
    component: StartingPackageStep,
    defaultProps: {
      selectedClass: STUB_CLASS,
      onAccept: undefined,
      onCustomize: undefined,
      onBack: undefined,
    },
  },
  'racial-class-features': {
    label: 'RacialClassFeaturesStep',
    component: RacialClassFeaturesStep,
    defaultProps: {
      selectedRace: STUB_RACE,
      selectedClass: STUB_CLASS,
      onContinue: undefined,
      onBack: undefined,
    },
  },
  'combat-numbers': {
    label: 'CombatNumbersStep',
    component: CombatNumbersStep,
    defaultProps: {
      characterId: 'preview-char',
      abilities: STUB_ABILITIES,
      selectedClass: STUB_CLASS,
      selectedRace: STUB_RACE,
      onContinue: undefined,
      onBack: undefined,
    },
  },
  'equipment-allocator': {
    label: 'EquipmentAllocator',
    component: EquipmentAllocator,
    defaultProps: {
      config: { starting_gold_ref: 'srd:gold' },
      startingGold: 150,
      selectedClass: STUB_CLASS,
      selectedRace: STUB_RACE,
    },
  },
  'details': {
    label: 'DetailsStep',
    component: DetailsStep,
    defaultProps: {
      characterName: 'Thalindra',
      playerName: 'Thomas',
      alignment: 'Neutral Good',
      deity: 'Corellon Larethian',
      height: "5'6\"",
      weight: '110 lbs',
      age: 120,
      eyes: 'Amber',
      hair: 'Silver',
      skin: 'Pale',
      selectedRace: STUB_RACE,
      unlocked: false,
      onCharacterNameChange: undefined,
      onPlayerNameChange: undefined,
      onAlignmentChange: undefined,
      onDeityChange: undefined,
      onHeightChange: undefined,
      onWeightChange: undefined,
      onAgeChange: undefined,
      onEyesChange: undefined,
      onHairChange: undefined,
      onSkinChange: undefined,
    },
  },
  'description': {
    label: 'DescriptionStep',
    component: DescriptionStep,
    defaultProps: {
      appearance: 'Slender with silver hair and amber eyes.',
      background: 'A wandering scout from the Silverwood.',
      onAppearanceChange: undefined,
      onBackgroundChange: undefined,
    },
  },
  'text-form': {
    label: 'TextForm',
    component: TextForm,
    defaultProps: {
      config: { fields: ['name', 'appearance', 'background'] },
      values: { name: 'Thalindra', appearance: '', background: '' },
      onChange: undefined,
    },
  },
  'narrative-block': {
    label: 'NarrativeBlock',
    component: NarrativeBlock,
    defaultProps: {
      config: { text: 'Welcome, adventurer. Your legend begins now. Choose wisely, for the choices you make will echo through eternity.' },
    },
  },
  'name-step': {
    label: 'NameStep',
    component: NameStep,
    defaultProps: {
      characterName: 'Thalindra',
      playerName: 'Thomas',
      alignment: 'neutral-good',
      deity: '',
      height: '',
      weight: '',
      age: '',
      eyes: '',
      hair: '',
      skin: '',
      appearance: '',
      background: '',
      onCharacterNameChange: undefined,
      onPlayerNameChange: undefined,
      onAlignmentChange: undefined,
      onDeityChange: undefined,
      onHeightChange: undefined,
      onWeightChange: undefined,
      onAgeChange: undefined,
      onEyesChange: undefined,
      onHairChange: undefined,
      onSkinChange: undefined,
      onAppearanceChange: undefined,
      onBackgroundChange: undefined,
      onStartCreation: undefined,
    },
  },
  'review': {
    label: 'ReviewStep',
    component: ReviewStep,
    defaultProps: {
      characterName: 'Thalindra',
      selectedRace: STUB_RACE,
      selectedClass: STUB_CLASS,
      abilities: STUB_ABILITIES,
      onFinish: undefined,
      onBack: undefined,
    },
  },
  'alignment-grid': {
    label: 'AlignmentGrid',
    component: AlignmentGrid,
    defaultProps: {
      value: 'Neutral Good',
      restrictions: [],
      unlocked: false,
      onChange: undefined,
    },
  },
  'color-picker': {
    label: 'ColorPicker',
    component: ColorPicker,
    defaultProps: {
      palette: EYE_COLORS,
      value: 'Amber',
      placeholder: 'Select eye color',
      label: 'Eye Color',
      onChange: undefined,
    },
  },
  'deity-selector': {
    label: 'DeitySelector',
    component: DeitySelector,
    defaultProps: {
      value: '',
      onChange: undefined,
    },
  },
  'age-picker': {
    label: 'AgePicker',
    component: AgePicker,
    defaultProps: {
      value: 120,
      race: STUB_RACE,
      unlocked: false,
      onChange: undefined,
    },
  },
  'entity-selector': {
    label: 'EntitySelector',
    component: EntitySelector,
    defaultProps: {
      config: { entity_type: 'race', display: 'card-grid', filter_eligible: false },
      entities: [STUB_RACE, { ...STUB_RACE, id: 'srd:races:human', properties: { ...STUB_RACE.properties, name: 'Human' } }],
      selectedIds: [],
      onSelect: undefined,
    },
  },
}
