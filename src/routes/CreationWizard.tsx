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
  getWorkflowStatus,
} from '../lib/engine'
import type { Entity, WorkflowStatus } from '../lib/types'
import { DEFAULT_ABILITY_SCORES } from '../lib/dnd35/constants'
import { WizardProgress, type WizardStep } from '../components/wizard/WizardProgress'
import { NameStep } from '../components/wizard/NameStep'
import { RaceStep } from '../components/wizard/RaceStep'
import { ClassStep } from '../components/wizard/ClassStep'
import { AbilitiesStep } from '../components/wizard/AbilitiesStep'
import { SkillsStep } from '../components/wizard/SkillsStep'
import { FeatsStep } from '../components/wizard/FeatsStep'
import { ReviewStep } from '../components/wizard/ReviewStep'

const STEP_ORDER: WizardStep[] = ['name', 'race', 'class', 'abilities', 'skills', 'feats', 'review']

export default function CreationWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState<WizardStep>('name')
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [characterName, setCharacterName] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [alignment, setAlignment] = useState('')
  const [deity, setDeity] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [age, setAge] = useState('')
  const [eyes, setEyes] = useState('')
  const [hair, setHair] = useState('')
  const [skin, setSkin] = useState('')
  const [appearance, setAppearance] = useState('')
  const [background, setBackground] = useState('')
  const [races, setRaces] = useState<Entity[]>([])
  const [classes, setClasses] = useState<Entity[]>([])
  const [selectedRace, setSelectedRace] = useState<Entity | null>(null)
  const [selectedClass, setSelectedClass] = useState<Entity | null>(null)
  const [selectedClassB, setSelectedClassB] = useState<Entity | null>(null)
  const [isGestalt, setIsGestalt] = useState(false)
  const [abilities, setAbilities] = useState<Record<string, number>>(DEFAULT_ABILITY_SCORES)
  const [abilityMethod, setAbilityMethod] = useState<'manual' | 'array' | 'roll' | 'pointbuy'>('manual')
  const [pointBuyRemaining, setPointBuyRemaining] = useState(27)
  const [availableFeats, setAvailableFeats] = useState<Entity[]>([])
  const [selectedFeats, setSelectedFeats] = useState<string[]>([])
  const [featSlotsRemaining, setFeatSlotsRemaining] = useState(1)
  const [skillPointsRemaining, setSkillPointsRemaining] = useState(0)
  const [skillAllocations, setSkillAllocations] = useState<Record<string, number>>({})
  const [classSkillNames, setClassSkillNames] = useState<string[]>([])
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({
    completed: [],
    pending: [],
    available: [],
  })

  useEffect(() => {
    loadContent()
  }, [])

  useEffect(() => {
    if (step === 'feats') {
      loadFeatsStep()
    }
    if (step === 'skills') {
      loadSkillsStep()
    }
  }, [step])

  async function loadContent() {
    try {
      const raceEntities = await getAvailableChoices('', 'race')
      setRaces(raceEntities)
    } catch (err) {
      console.error('Failed to load races:', err)
      setRaces([])
    }
    try {
      const classEntities = await getAvailableChoices('', 'class')
      setClasses(classEntities)
    } catch (err) {
      console.error('Failed to load classes:', err)
      setClasses([])
    }
  }

  async function refreshWorkflowStatus() {
    if (!characterId) return
    try {
      const status = await getWorkflowStatus(characterId, 'srd:workflow:character_creation')
      setWorkflowStatus(status)
    } catch (err) {
      console.error('Failed to load workflow status:', err)
    }
  }

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

  async function handleStartCreation() {
    if (!characterName.trim()) return
    const id = await createCharacter(characterName)
    setCharacterId(id)

    const identity: Record<string, unknown> = {
      player_name: playerName || null,
      alignment: alignment || null,
      deity: deity || null,
      height: height ? parseInt(height as string, 10) : null,
      weight: weight ? parseInt(weight as string, 10) : null,
      age: age ? parseInt(age as string, 10) : null,
      eyes: eyes || null,
      hair: hair || null,
      skin: skin || null,
      appearance: appearance || null,
      background: background || null,
    }
    try {
      await updateCharacterIdentity(id, identity)
    } catch (err) {
      console.error('Failed to update identity:', err)
    }

    try {
      const status = await getWorkflowStatus(id, 'srd:workflow:character_creation')
      setWorkflowStatus(status)
      const firstPending = status.pending[0]
      if (firstPending === 'select-race') setStep('race')
    } catch (err) {
      console.error('Failed to load workflow status:', err)
      setStep('race')
    }
  }

  async function handleSelectRace(race: Entity) {
    if (!characterId) return
    await selectRace(characterId, race.id)
    setSelectedRace(race)
    try {
      const status = await getWorkflowStatus(characterId, 'srd:workflow:character_creation')
      setWorkflowStatus(status)
      const next = status.pending[0]
      if (next === 'select-class') setStep('class')
    } catch (err) {
      console.error('Failed to refresh workflow:', err)
      setStep('class')
    }
  }

  async function handleSelectClassAction(cls: Entity, slot: 'A' | 'B') {
    if (!characterId) return
    await selectClass(characterId, cls.id, 1, slot)
    if (slot === 'A') {
      setSelectedClass(cls)
    } else {
      setSelectedClassB(cls)
    }
  }

  async function handleClassContinue() {
    if (!characterId) return
    try {
      const status = await getWorkflowStatus(characterId, 'srd:workflow:character_creation')
      setWorkflowStatus(status)
      const next = status.pending[0]
      if (next === 'assign-ability-scores') setStep('abilities')
    } catch (err) {
      console.error('Failed to refresh workflow:', err)
      setStep('abilities')
    }
  }

  async function handleAssignAbilities() {
    if (!characterId) return
    await assignAbilityScores(characterId, abilities)
    await refreshWorkflowStatus()
    setStep('skills')
  }

  async function handleAllocateSkill(skill: string, delta: number) {
    if (!characterId) return
    const isClassSkill = classSkillNames.some(
      (cs) => cs.toLowerCase() === skill.toLowerCase()
    )
    const cost = isClassSkill ? 1 : 2

    const currentAllocated = skillAllocations[skill] || 0
    const newAllocated = Math.max(0, currentAllocated + delta)

    let totalEstimate = 0
    for (const [s, ranks] of Object.entries(skillAllocations)) {
      if (s === skill) continue
      const isCs = classSkillNames.some(
        (cs) => cs.toLowerCase() === s.toLowerCase()
      )
      totalEstimate += ranks * (isCs ? 1 : 2)
    }
    totalEstimate += newAllocated * cost

    if (totalEstimate > skillPointsRemaining) return
    if (newAllocated < 0) return

    const newAllocations = { ...skillAllocations, [skill]: newAllocated }
    setSkillAllocations(newAllocations)
    setSkillPointsRemaining(skillPointsRemaining - delta * cost)

    const allocations: Record<string, number> = {}
    allocations[skill] = delta

    try {
      await allocateSkillPoints(characterId, allocations)
    } catch (err) {
      setSkillAllocations(skillAllocations)
      setSkillPointsRemaining(skillPointsRemaining + delta * cost)
      console.error('Failed to allocate skill points:', err)
    }
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

  async function handleSkillsContinue() {
    await refreshWorkflowStatus()
    setStep('review')
  }

  async function handleFeatsContinue() {
    await refreshWorkflowStatus()
    setStep('review')
  }

  function handleFinish() {
    if (characterId) {
      navigate(`/character/${characterId}`)
    }
  }

  function handleRollAbilities() {
    setAbilityMethod('roll')
    const abilities_order = [
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ]
    const newAbilities: Record<string, number> = {}
    const rolls = Array.from({ length: 6 }, () => {
      const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
      rolls.sort((a, b) => a - b)
      return rolls[1] + rolls[2] + rolls[3]
    })
    rolls
      .sort((a, b) => b - a)
      .forEach((roll, i) => {
        newAbilities[abilities_order[i]] = roll
      })
    setAbilities(newAbilities)
  }

  function handleStandardArray() {
    setAbilityMethod('array')
    setAbilities({
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 12,
      wisdom: 10,
      charisma: 8,
    })
    setPointBuyRemaining(27)
  }

  function handlePointBuy() {
    setAbilityMethod('pointbuy')
    setPointBuyRemaining(27)
    setAbilities(DEFAULT_ABILITY_SCORES)
  }

  function handleManualEntry() {
    setAbilityMethod('manual')
  }

  const POINT_BUY_COST: Record<number, number> = {
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9,
    16: 12,
    17: 15,
    18: 19,
  }

  function handleAbilityPointBuy(ability: string, delta: number) {
    setAbilities((prev) => {
      const current = prev[ability] || 8
      const newValue = Math.max(8, Math.min(18, current + delta))
      if (newValue === current) return prev

      const oldCost = POINT_BUY_COST[current] || 0
      const newCost = POINT_BUY_COST[newValue] || 0
      const costDiff = newCost - oldCost

      if (costDiff > pointBuyRemaining && delta > 0) return prev

      setPointBuyRemaining((prevPb) => Math.max(0, prevPb - costDiff))
      return { ...prev, [ability]: newValue }
    })
  }

  function handleAbilityManualChange(ability: string, value: number) {
    setAbilities((prev) => ({ ...prev, [ability]: value }))
  }

  function handleToggleGestalt(value: boolean) {
    setIsGestalt(value)
    if (!value) {
      setSelectedClassB(null)
    }
  }

  // Map workflow step IDs to wizard steps for progress indicator
  const WORKFLOW_STEP_MAP: Record<string, WizardStep> = {
    'select-race': 'race',
    'select-class': 'class',
    'assign-ability-scores': 'abilities',
    'allocate-skills': 'skills',
    'select-feats': 'feats',
  }

  const completedWizardSteps = new Set(
    workflowStatus.completed
      .map((ws) => WORKFLOW_STEP_MAP[ws])
      .filter((ws): ws is WizardStep => ws !== undefined)
  )

  function renderStep() {
    switch (step) {
      case 'name':
        return (
          <NameStep
            characterName={characterName}
            playerName={playerName}
            alignment={alignment}
            deity={deity}
            height={height}
            weight={weight}
            age={age}
            eyes={eyes}
            hair={hair}
            skin={skin}
            appearance={appearance}
            background={background}
            onCharacterNameChange={setCharacterName}
            onPlayerNameChange={setPlayerName}
            onAlignmentChange={setAlignment}
            onDeityChange={setDeity}
            onHeightChange={setHeight}
            onWeightChange={setWeight}
            onAgeChange={setAge}
            onEyesChange={setEyes}
            onHairChange={setHair}
            onSkinChange={setSkin}
            onAppearanceChange={setAppearance}
            onBackgroundChange={setBackground}
            onStartCreation={handleStartCreation}
          />
        )

      case 'race':
        return (
          <RaceStep
            races={races}
            selectedRace={selectedRace}
            onSelectRace={handleSelectRace}
          />
        )

      case 'class':
        return (
          <ClassStep
            classes={classes}
            selectedClass={selectedClass}
            selectedClassB={selectedClassB}
            isGestalt={isGestalt}
            onToggleGestalt={handleToggleGestalt}
            onSelectClass={handleSelectClassAction}
            onContinue={handleClassContinue}
            onBack={() => setStep('race')}
          />
        )

      case 'abilities':
        return (
          <AbilitiesStep
            abilities={abilities}
            abilityMethod={abilityMethod}
            pointBuyRemaining={pointBuyRemaining}
            selectedClass={selectedClass}
            onRollAbilities={handleRollAbilities}
            onStandardArray={handleStandardArray}
            onPointBuy={handlePointBuy}
            onManualEntry={handleManualEntry}
            onAbilityPointBuy={handleAbilityPointBuy}
            onAbilityManualChange={handleAbilityManualChange}
            onAssignAbilities={handleAssignAbilities}
            onBack={() => setStep('class')}
          />
        )

      case 'skills':
        return (
          <SkillsStep
            abilities={abilities}
            skillAllocations={skillAllocations}
            classSkillNames={classSkillNames}
            skillPointsRemaining={skillPointsRemaining}
            onAllocateSkill={handleAllocateSkill}
            onContinue={handleSkillsContinue}
            onBack={() => setStep('abilities')}
          />
        )

      case 'feats':
        return (
          <FeatsStep
            availableFeats={availableFeats}
            selectedFeats={selectedFeats}
            featSlotsRemaining={featSlotsRemaining}
            onSelectFeat={handleSelectFeat}
            onContinue={handleFeatsContinue}
            onBack={() => setStep('abilities')}
          />
        )

      case 'review':
        return (
          <ReviewStep
            characterName={characterName}
            selectedRace={selectedRace}
            selectedClass={selectedClass}
            abilities={abilities}
            onFinish={handleFinish}
            onBack={() => setStep('abilities')}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Create New Character</h1>

      <WizardProgress
        currentStep={step}
        completedSteps={completedWizardSteps}
        stepOrder={STEP_ORDER}
      />

      <div className="bg-white p-6 rounded-lg shadow">{renderStep()}</div>
    </div>
  )
}
