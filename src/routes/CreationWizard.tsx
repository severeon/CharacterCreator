import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import {
  createCharacter,
  updateCharacterIdentity,
  selectRace,
  selectClass,
  assignAbilityScores,
  allocateSkillPoints,
  getAvailableChoices,
  selectFeat,
  getAvailableFeats,
  getEntityById,
} from '../lib/engine'
import type { Entity, WorkflowState, WorkflowStep } from '../lib/types'
import { DEFAULT_ABILITY_SCORES } from '../lib/dnd35/constants'
import { useWorkflow } from '../hooks/useWorkflow'
import { WorkflowStepper } from '../components/wizard/WorkflowStepper'
import { AbilityAllocator } from '../components/wizard/AbilityAllocator'
import { EntitySelector } from '../components/wizard/EntitySelector'
import { SkillAllocator } from '../components/wizard/SkillAllocator'
import { TextForm } from '../components/wizard/TextForm'
import { EquipmentAllocator } from '../components/wizard/EquipmentAllocator'
import { NarrativeBlock } from '../components/wizard/NarrativeBlock'
import { RacialClassFeaturesStep } from '../components/wizard/RacialClassFeaturesStep'
import { StartingPackageStep } from '../components/wizard/StartingPackageStep'
import { CombatNumbersStep } from '../components/wizard/CombatNumbersStep'

export default function CreationWizard() {
  const navigate = useNavigate()
  const workflow = useWorkflow('srd:workflow:character-creation')
  const [wizardState, setWizardState] = useState<WorkflowState>({
    currentStep: 0,
    completed: [],
    data: {},
  })

  const [characterId, setCharacterId] = useState<string | null>(null)

  // Identity/details
  const [textFields, setTextFields] = useState<Record<string, string>>({
    name: '',
    player_name: '',
    alignment: '',
    deity: '',
    height: '',
    weight: '',
    age: '',
    eyes: '',
    hair: '',
    skin: '',
    appearance: '',
    background: '',
  })

  // Content choices
  const [races, setRaces] = useState<Entity[]>([])
  const [classes, setClasses] = useState<Entity[]>([])
  const [selectedRace, setSelectedRace] = useState<Entity | null>(null)
  const [selectedClass, setSelectedClass] = useState<Entity | null>(null)

  // Ability scores
  const [rolledSets, setRolledSets] = useState<number[][]>([])
  const [abilities, setAbilities] = useState<Record<string, number>>(DEFAULT_ABILITY_SCORES)
  const [abilityMethod, setAbilityMethod] = useState<'manual' | 'array' | 'roll' | 'pointbuy'>('manual')
  const [pointBuyRemaining, setPointBuyRemaining] = useState(27)

  // Skills
  const [skillPointsRemaining, setSkillPointsRemaining] = useState(0)
  const [skillAllocations, setSkillAllocations] = useState<Record<string, number>>({})
  const [classSkillNames, setClassSkillNames] = useState<string[]>([])

  // Feats
  const [availableFeats, setAvailableFeats] = useState<Entity[]>([])
  const [selectedFeats, setSelectedFeats] = useState<string[]>([])
  const [featSlotsRemaining, setFeatSlotsRemaining] = useState(1)

  // Equipment
  const [startingGold] = useState(100)

  async function loadContent() {
    try {
      setRaces(await getAvailableChoices('', 'race'))
    } catch (err) {
      console.error('Failed to load races:', err)
    }
    try {
      setClasses(await getAvailableChoices('', 'class'))
    } catch (err) {
      console.error('Failed to load classes:', err)
    }
  }

  useEffect(() => {
    loadContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadSkillsStep() {
    if (!characterId) return
    const character = await getEntityById(characterId)
    if (!character) return

    const pointsPerLevel = (character.properties['skill_points_per_level'] as number) ?? 2
    const remaining = (character.properties['skill_points_remaining'] as number) ?? pointsPerLevel
    setSkillPointsRemaining(remaining)

    const classId = character.properties['class']
    if (typeof classId === 'string') {
      const cls = await getEntityById(classId)
      if (cls) {
        const skills = cls.properties['classSkills']
        if (Array.isArray(skills)) {
          setClassSkillNames(skills.map((s) => String(s)))
        }
      }
    }

    const existing: Record<string, number> = {}
    Object.entries(character.properties).forEach(([key, val]) => {
      if (key.startsWith('skills.') && key.endsWith('.ranks') && typeof val === 'number') {
        const skill = key.replace('skills.', '').replace('.ranks', '')
        existing[skill] = val
      }
    })
    setSkillAllocations(existing)
  }

  async function loadFeatsStep() {
    if (!characterId) return
    const [feats, character] = await Promise.all([
      getAvailableFeats(characterId),
      getEntityById(characterId),
    ])
    setAvailableFeats(feats)
    if (character) {
      const slots = character.properties['feat_slots_remaining']
      setFeatSlotsRemaining(typeof slots === 'number' ? slots : 1)
      const selected = character.properties['feats_selected']
      setSelectedFeats(Array.isArray(selected) ? (selected as string[]) : [])
    }
  }

  // ---- Ability score handlers ----

  function handleRollAbilities() {
    setAbilityMethod('roll')
    // Generate 6 sets of 4 dice (each set = [d1, d2, d3, d4])
    const sets: number[][] = Array.from({ length: 6 }, () =>
      Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
    )
    setRolledSets(sets)
    // Auto-assign: total = sum of top 3 dice per set, sorted descending → assigned to stats
    const totals = sets
      .map(set => [...set].sort((a, b) => a - b).slice(1).reduce((s, v) => s + v, 0))
      .sort((a, b) => b - a)
    const keys = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
    const newAbilities: Record<string, number> = {}
    keys.forEach((k, i) => { newAbilities[k] = totals[i] })
    setAbilities(newAbilities)
  }

  function handleStandardArray() {
    setAbilityMethod('array')
    setRolledSets([])
    setAbilities({ strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 })
  }

  function handlePointBuy() {
    setAbilityMethod('pointbuy')
    setRolledSets([])
    setPointBuyRemaining(27)
    setAbilities(DEFAULT_ABILITY_SCORES)
  }

  function handleManualEntry() {
    setAbilityMethod('manual')
    setRolledSets([])
  }

  const POINT_BUY_COST: Record<number, number> = {
    8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9, 16: 12, 17: 15, 18: 19,
  }

  function handleAbilityPointBuy(ability: string, delta: number) {
    setAbilities((prev) => {
      const current = prev[ability] || 8
      const newValue = Math.max(8, Math.min(18, current + delta))
      if (newValue === current) return prev
      const costDiff = (POINT_BUY_COST[newValue] || 0) - (POINT_BUY_COST[current] || 0)
      if (costDiff > pointBuyRemaining && delta > 0) return prev
      setPointBuyRemaining((pb) => Math.max(0, pb - costDiff))
      return { ...prev, [ability]: newValue }
    })
  }

  function handleAbilityManualChange(ability: string, value: number) {
    setAbilities((prev) => ({ ...prev, [ability]: value }))
  }

  // ---- Navigation ----

  async function handleNext() {
    if (!workflow) return
    const steps = workflow.properties.steps
    const step = steps[wizardState.currentStep]

    // Step-specific side effects on advance
    if (step.id === 'assign-abilities' && characterId) {
      await assignAbilityScores(characterId, abilities)
    }
    if (step.id === 'details' && characterId) {
      await updateCharacterIdentity(characterId, {
        name: textFields['name'] || 'Unnamed Character',
        player_name: textFields['player_name'] || null,
        alignment: textFields['alignment'] || null,
        deity: textFields['deity'] || null,
        height: textFields['height'] ? parseInt(textFields['height'], 10) : null,
        weight: textFields['weight'] ? parseInt(textFields['weight'], 10) : null,
        age: textFields['age'] ? parseInt(textFields['age'], 10) : null,
        eyes: textFields['eyes'] || null,
        hair: textFields['hair'] || null,
        skin: textFields['skin'] || null,
        appearance: textFields['appearance'] || null,
        background: textFields['background'] || null,
      })
      navigate(`/character/${characterId}`)
      return
    }
    // Advance state
    setWizardState((prev) => ({
      currentStep: Math.min(prev.currentStep + 1, steps.length - 1),
      completed: [...prev.completed, step.id],
      data: prev.data,
    }))
    // Load data for the upcoming step
    const nextStep = steps[wizardState.currentStep + 1]
    if (nextStep?.id === 'allocate-skills') await loadSkillsStep()
    if (nextStep?.id === 'select-feats') await loadFeatsStep()
  }

  function handleBack() {
    setWizardState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }))
  }

  // ---- Race / Class selection (auto-advance + character creation) ----

  async function handleSelectRace(race: Entity) {
    setSelectedRace(race)
    setWizardState((prev) => ({
      currentStep: prev.currentStep + 1,
      completed: [...prev.completed, 'select-race'],
      data: prev.data,
    }))
  }

  async function handleSelectClass(cls: Entity) {
    setSelectedClass(cls)
    // Create character now that we have race + class
    const name = textFields['name']?.trim() || 'Unnamed Character'
    const id = await createCharacter(name)
    setCharacterId(id)
    if (selectedRace) await selectRace(id, selectedRace.id)
    await selectClass(id, cls.id, 1, 'A')
    setWizardState((prev) => ({
      currentStep: prev.currentStep + 1,
      completed: [...prev.completed, 'select-class'],
      data: prev.data,
    }))
  }

  async function handleSelectFeat(feat: Entity) {
    if (!characterId || featSlotsRemaining <= 0) return
    try {
      await selectFeat(characterId, feat.id)
      await loadFeatsStep()
    } catch (err) {
      console.error('Failed to select feat:', err)
    }
  }

  async function handleAllocateSkill(skill: string, delta: number) {
    if (!characterId) return
    const isClassSkill = classSkillNames.some((cs) => cs.toLowerCase() === skill.toLowerCase())
    const cost = isClassSkill ? 1 : 2
    const currentAllocated = skillAllocations[skill] || 0
    const newAllocated = Math.max(0, currentAllocated + delta)
    if (delta > 0 && cost > skillPointsRemaining) return

    try {
      setSkillAllocations((prev) => ({ ...prev, [skill]: newAllocated }))
      setSkillPointsRemaining((prev) => prev - delta * cost)
      await allocateSkillPoints(characterId, { [skill]: delta })
    } catch (err) {
      setSkillAllocations((prev) => ({ ...prev, [skill]: currentAllocated }))
      setSkillPointsRemaining((prev) => prev + delta * cost)
      console.error('Failed to allocate skill points:', err)
    }
  }

  // ---- Step renderer (render prop for WorkflowStepper) ----

  function renderStepContent(step: WorkflowStep) {
    switch (step.id) {
      case 'roll-abilities':
        return (
          <AbilityAllocator
            config={{ mode: 'generate' }}
            rolledSets={rolledSets}
            abilityMethod={abilityMethod}
            pointBuyRemaining={pointBuyRemaining}
            abilities={abilities}
            selectedClass={selectedClass}
            onRollAbilities={handleRollAbilities}
            onStandardArray={handleStandardArray}
            onPointBuy={handlePointBuy}
            onManualEntry={handleManualEntry}
            onAbilityPointBuy={handleAbilityPointBuy}
            onAbilityManualChange={handleAbilityManualChange}
          />
        )

      case 'select-race':
        return (
          <EntitySelector
            config={{ entity_type: 'template.race', display: 'card-grid' }}
            entities={races}
            selectedIds={selectedRace ? [selectedRace.id] : []}
            onSelect={handleSelectRace}
          />
        )

      case 'select-class':
        return (
          <EntitySelector
            config={{ entity_type: 'template.class', display: 'card-grid' }}
            entities={classes}
            selectedIds={selectedClass ? [selectedClass.id] : []}
            onSelect={handleSelectClass}
          />
        )

      case 'assign-abilities':
        return (
          <AbilityAllocator
            config={{ mode: 'assign', show_racial_bonuses: true }}
            rolledSets={rolledSets}
            abilityMethod={abilityMethod}
            pointBuyRemaining={pointBuyRemaining}
            abilities={abilities}
            selectedClass={selectedClass}
            onRollAbilities={handleRollAbilities}
            onStandardArray={handleStandardArray}
            onPointBuy={handlePointBuy}
            onManualEntry={handleManualEntry}
            onAbilityPointBuy={handleAbilityPointBuy}
            onAbilityManualChange={handleAbilityManualChange}
          />
        )

      case 'starting-package':
        return (
          <StartingPackageStep
            selectedClass={selectedClass}
            onAccept={() => {}}
            onCustomize={() => {}}
            onBack={handleBack}
          />
        )

      case 'racial-class-features':
        return (
          <RacialClassFeaturesStep
            selectedRace={selectedRace}
            selectedClass={selectedClass}
            onContinue={() => {}}
            onBack={handleBack}
          />
        )

      case 'allocate-skills':
        return (
          <SkillAllocator
            config={{ skills_ref: 'srd:mechanic:skills' }}
            abilities={abilities}
            skillAllocations={skillAllocations}
            classSkillNames={classSkillNames}
            skillPointsRemaining={skillPointsRemaining}
            onAllocateSkill={handleAllocateSkill}
          />
        )

      case 'select-feats':
        return (
          <EntitySelector
            config={{ entity_type: 'rule.feat', display: 'filterable-list', filter_eligible: true }}
            entities={availableFeats}
            selectedIds={selectedFeats}
            onSelect={handleSelectFeat}
          />
        )

      case 'description':
        return (
          <TextForm
            config={{ fields: ['appearance', 'background'] }}
            values={textFields}
            onChange={(field, value) => setTextFields((prev) => ({ ...prev, [field]: value }))}
          />
        )

      case 'equipment':
        return (
          <EquipmentAllocator
            config={{ starting_gold_ref: 'srd:mechanic:starting-gold' }}
            startingGold={startingGold}
            selectedClass={selectedClass}
            selectedRace={selectedRace}
          />
        )

      case 'combat-numbers':
        return (
          <CombatNumbersStep
            characterId={characterId}
            abilities={abilities}
            selectedClass={selectedClass}
            selectedRace={selectedRace}
            onContinue={() => {}}
            onBack={handleBack}
          />
        )

      case 'details':
        return (
          <TextForm
            config={{ fields: ['name', 'player_name', 'alignment', 'deity', 'height', 'weight', 'age', 'eyes', 'hair', 'skin'] }}
            values={textFields}
            onChange={(field, value) => setTextFields((prev) => ({ ...prev, [field]: value }))}
          />
        )

      default:
        return (
          <NarrativeBlock config={{ text: (step.config['text'] as string) ?? '' }} />
        )
    }
  }

  if (!workflow) {
    return <div className="dnd-loading">Loading workflow…</div>
  }

  // Race and class steps auto-advance on selection — suppress the WorkflowStepper's Next button for them
  const autoAdvanceSteps = new Set(['select-race', 'select-class', 'select-feats'])

  return (
    <div style={{ padding: '1.75rem 2rem', maxWidth: '64rem' }}>
      <h2 className="dnd-page-header">Create New Character</h2>
      <div className="stat-block">
        <WorkflowStepper
          workflow={workflow}
          state={wizardState}
          onNext={handleNext}
          onBack={handleBack}
        >
          {(step) => (
            <div>
              {renderStepContent(step)}
              {autoAdvanceSteps.has(step.id) && (
                <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--ink-light)', marginTop: '1rem', opacity: 0.8 }}>
                  Select an option above to continue.
                </p>
              )}
            </div>
          )}
        </WorkflowStepper>
      </div>
    </div>
  )
}
