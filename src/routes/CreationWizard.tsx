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
import { RollAbilitiesStep } from '../components/wizard/RollAbilitiesStep'
import { DetailsStep } from '../components/wizard/DetailsStep'
import { RaceStep } from '../components/wizard/RaceStep'
import { ClassStep } from '../components/wizard/ClassStep'
import { AssignAbilitiesStep } from '../components/wizard/AssignAbilitiesStep'
import { SkillsStep } from '../components/wizard/SkillsStep'
import { FeatStep } from '../components/wizard/FeatStep'
import { StartingPackageStep } from '../components/wizard/StartingPackageStep'
import { RacialClassFeaturesStep } from '../components/wizard/RacialClassFeaturesStep'
import { DescriptionStep } from '../components/wizard/DescriptionStep'
import { EquipmentStep } from '../components/wizard/EquipmentStep'
import { CombatNumbersStep } from '../components/wizard/CombatNumbersStep'

const STEP_ORDER: WizardStep[] = [
  'roll-abilities',
  'race',
  'class',
  'assign-abilities',
  'starting-package',
  'racial-class-features',
  'skills',
  'feat',
  'description',
  'equipment',
  'combat-numbers',
  'details',
]

export default function CreationWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState<WizardStep>('roll-abilities')
  const [characterId, setCharacterId] = useState<string | null>(null)

  // Identity/details (step 11)
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

  // Content choices
  const [races, setRaces] = useState<Entity[]>([])
  const [classes, setClasses] = useState<Entity[]>([])
  const [selectedRace, setSelectedRace] = useState<Entity | null>(null)
  const [selectedClass, setSelectedClass] = useState<Entity | null>(null)
  const [selectedClassB, setSelectedClassB] = useState<Entity | null>(null)
  const [isGestalt, setIsGestalt] = useState(false)

  // Ability scores (step 1: roll, step 3: assign)
  const [rolledSets, setRolledSets] = useState<number[][]>([])
  const [abilities, setAbilities] = useState<Record<string, number>>(DEFAULT_ABILITY_SCORES)
  const [abilityMethod, setAbilityMethod] = useState<'manual' | 'array' | 'roll' | 'pointbuy'>('manual')
  const [pointBuyRemaining, setPointBuyRemaining] = useState(27)

  // Skills (step 6)
  const [skillPointsRemaining, setSkillPointsRemaining] = useState(0)
  const [skillAllocations, setSkillAllocations] = useState<Record<string, number>>({})
  const [classSkillNames, setClassSkillNames] = useState<string[]>([])

  // Feats (step 7)
  const [availableFeats, setAvailableFeats] = useState<Entity[]>([])
  const [selectedFeats, setSelectedFeats] = useState<string[]>([])
  const [featSlotsRemaining, setFeatSlotsRemaining] = useState(1)

  // Equipment (step 9)
  const [startingGold] = useState(100)

  // Workflow
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({
    completed: [],
    pending: [],
    available: [],
  })

  useEffect(() => {
    loadContent()
  }, [])

  useEffect(() => {
    if (step === 'skills') {
      loadSkillsStep()
    }
    if (step === 'feat') {
      loadFeatsStep()
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

  // Step 1: Roll abilities - generate 6 ability scores (4d6 drop lowest each)
  function handleRollAbilities() {
    setAbilityMethod('roll')
    // 6 independent ability scores, each from 4d6 drop lowest
    const scores: number[] = Array.from({ length: 6 }, () => {
      const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
      rolls.sort((a, b) => a - b)
      return rolls[1] + rolls[2] + rolls[3] // sum of 3 highest = one ability score
    })
    // Sort highest to lowest for display
    const sortedScores = [...scores].sort((a, b) => b - a)
    setRolledSets([sortedScores]) // Store as single "set" for display purposes
    // Pre-fill abilities with the highest set
    const abilities_order = [
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ]
    const newAbilities: Record<string, number> = {}
    abilities_order.forEach((ability, i) => {
      newAbilities[ability] = sortedScores[i]
    })
    setAbilities(newAbilities)
  }

  function handleStandardArray() {
    setAbilityMethod('array')
    setRolledSets([])
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
    setRolledSets([])
    setPointBuyRemaining(27)
    setAbilities(DEFAULT_ABILITY_SCORES)
  }

  function handleManualEntry() {
    setAbilityMethod('manual')
    setRolledSets([])
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

  // Step 2: Race selection
  async function handleSelectRace(race: Entity) {
    setSelectedRace(race)
    setStep('class')
  }

  // Step 3: Class selection
  async function handleSelectClassAction(cls: Entity, slot: 'A' | 'B') {
    if (slot === 'A') {
      setSelectedClass(cls)
      // For non-gestalt, pass cls directly to avoid stale state closure
      if (!isGestalt) {
        await handleClassContinue(cls)
      }
    } else {
      setSelectedClassB(cls)
    }
  }

  async function handleClassContinue(classOverride?: Entity) {
    const classA = classOverride ?? selectedClass
    // Create the character now that we have race and class
    const name = characterName.trim() || 'Unnamed Character'
    const id = await createCharacter(name)
    setCharacterId(id)

    // Apply race
    if (selectedRace) {
      await selectRace(id, selectedRace.id)
    }

    // Apply class(es)
    if (classA) {
      await selectClass(id, classA.id, 1, 'A')
    }
    if (isGestalt && selectedClassB) {
      await selectClass(id, selectedClassB.id, 1, 'B')
    }

    setStep('assign-abilities')
  }

  // Step 4: Assign abilities
  async function handleAssignAbilities() {
    if (!characterId) return
    await assignAbilityScores(characterId, abilities)
    await refreshWorkflowStatus()
    setStep('starting-package')
  }

  // Step 5: Starting package - accept or customize
  function handleAcceptStartingPackage() {
    // TODO: Apply suggested skills, feats, equipment from starting package
    setStep('racial-class-features')
  }

  function handleCustomizeStartingPackage() {
    setStep('racial-class-features')
  }

  // Step 6: Skills
  async function handleAllocateSkill(skill: string, delta: number) {
    if (!characterId) return
    const isClassSkill = classSkillNames.some(
      (cs) => cs.toLowerCase() === skill.toLowerCase()
    )
    const cost = isClassSkill ? 1 : 2

    const currentAllocated = skillAllocations[skill] || 0
    const newAllocated = Math.max(0, currentAllocated + delta)

    // Check if we have enough points for this allocation
    if (delta > 0 && cost > skillPointsRemaining) return
    if (newAllocated < 0) return

    // Backend expects delta (change), not new total
    const allocations: Record<string, number> = {}
    allocations[skill] = delta

    try {
      // Update state optimistically using functional updates
      setSkillAllocations((prev) => ({ ...prev, [skill]: newAllocated }))
      setSkillPointsRemaining((prev) => prev - delta * cost)
      await allocateSkillPoints(characterId, allocations)
    } catch (err) {
      // Rollback on error
      setSkillAllocations((prev) => ({ ...prev, [skill]: currentAllocated }))
      setSkillPointsRemaining((prev) => prev + delta * cost)
      console.error('Failed to allocate skill points:', err)
    }
  }

  // Step 7: Feat
  async function handleSelectFeat(feat: Entity) {
    if (!characterId || featSlotsRemaining <= 0) return
    try {
      await selectFeat(characterId, feat.id)
      await loadFeatsStep()
    } catch (err) {
      console.error('Failed to select feat:', err)
    }
  }

  // Navigation
  async function handleFinishIdentity() {
    if (!characterId) return
    const identity: Record<string, unknown> = {
      name: characterName.trim() || 'Unnamed Character',
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
      await updateCharacterIdentity(characterId, identity)
    } catch (err) {
      console.error('Failed to update identity:', err)
    }
  }

  function handleFinish() {
    if (characterId) {
      navigate(`/character/${characterId}`)
    }
  }

  // Map workflow step IDs to wizard steps for progress indicator
  const WORKFLOW_STEP_MAP: Record<string, WizardStep> = {
    'select-race': 'race',
    'select-class': 'class',
    'assign-ability-scores': 'assign-abilities',
    'allocate-skills': 'skills',
    'select-feats': 'feat',
  }

  // Step handlers for skills and feats (still needed)
  async function handleSkillsContinue() {
    await refreshWorkflowStatus()
    setStep('description')
  }

  async function handleFeatsContinue() {
    await refreshWorkflowStatus()
    setStep('description')
  }

  const currentStepIndex = STEP_ORDER.indexOf(step)
  const completedWizardSteps = new Set<WizardStep>([
    // Backend-confirmed completions
    ...workflowStatus.completed
      .map((ws) => WORKFLOW_STEP_MAP[ws])
      .filter((ws): ws is WizardStep => ws !== undefined),
    // Any step the user has advanced past
    ...STEP_ORDER.filter((_, i) => i < currentStepIndex),
  ])

  function renderStep() {
    switch (step) {
      case 'roll-abilities':
        return (
          <RollAbilitiesStep
            rolledSets={rolledSets}
            abilityMethod={abilityMethod}
            onRollAbilities={handleRollAbilities}
            onStandardArray={handleStandardArray}
            onPointBuy={handlePointBuy}
            onManualEntry={handleManualEntry}
            onContinue={() => setStep('race')}
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
            onBack={() => setStep('roll-abilities')}
          />
        )

      case 'assign-abilities':
        return (
          <AssignAbilitiesStep
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

      case 'starting-package':
        return (
          <StartingPackageStep
            selectedClass={selectedClass}
            onAccept={handleAcceptStartingPackage}
            onCustomize={handleCustomizeStartingPackage}
            onBack={() => setStep('assign-abilities')}
          />
        )

      case 'racial-class-features':
        return (
          <RacialClassFeaturesStep
            selectedRace={selectedRace}
            selectedClass={selectedClass}
            onContinue={() => setStep('skills')}
            onBack={() => setStep('starting-package')}
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
            onBack={() => setStep('racial-class-features')}
          />
        )

      case 'feat':
        return (
          <FeatStep
            availableFeats={availableFeats}
            selectedFeats={selectedFeats}
            featSlotsRemaining={featSlotsRemaining}
            onSelectFeat={handleSelectFeat}
            onContinue={handleFeatsContinue}
            onBack={() => setStep('skills')}
          />
        )

      case 'description':
        return (
          <DescriptionStep
            appearance={appearance}
            background={background}
            onAppearanceChange={setAppearance}
            onBackgroundChange={setBackground}
            onContinue={() => setStep('equipment')}
            onBack={() => setStep('feat')}
          />
        )

      case 'equipment':
        return (
          <EquipmentStep
            startingGold={startingGold}
            selectedClass={selectedClass}
            selectedRace={selectedRace}
            onContinue={() => setStep('combat-numbers')}
            onBack={() => setStep('description')}
          />
        )

      case 'combat-numbers':
        return (
          <CombatNumbersStep
            characterId={characterId}
            abilities={abilities}
            selectedClass={selectedClass}
            selectedRace={selectedRace}
            onContinue={() => setStep('details')}
            onBack={() => setStep('equipment')}
          />
        )

      case 'details':
        return (
          <DetailsStep
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
            onFinish={async () => {
              await handleFinishIdentity()
              handleFinish()
            }}
            onBack={() => setStep('combat-numbers')}
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

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {renderStep()}
        </div>
      </div>

      {/* Fixed footer with navigation buttons - outside the scrollable container */}
      <div className="fixed bottom-0 left-48 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex gap-4">
          <button
            onClick={() => {
              if (step === 'race') setStep('roll-abilities')
              else if (step === 'class') setStep('race')
              else if (step === 'assign-abilities') setStep('class')
              else if (step === 'starting-package') setStep('assign-abilities')
              else if (step === 'racial-class-features') setStep('starting-package')
              else if (step === 'skills') setStep('racial-class-features')
              else if (step === 'feat') setStep('skills')
              else if (step === 'description') setStep('feat')
              else if (step === 'equipment') setStep('description')
              else if (step === 'combat-numbers') setStep('equipment')
              else if (step === 'details') setStep('combat-numbers')
            }}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={() => {
              if (step === 'roll-abilities') setStep('race')
              else if (step === 'race') {} // Race auto-advances
              else if (step === 'class') {} // Class auto-advances
              else if (step === 'assign-abilities') handleAssignAbilities()
              else if (step === 'starting-package') setStep('racial-class-features')
              else if (step === 'racial-class-features') setStep('skills')
              else if (step === 'skills') setStep('feat')
              else if (step === 'feat') setStep('description')
              else if (step === 'description') setStep('equipment')
              else if (step === 'equipment') setStep('combat-numbers')
              else if (step === 'combat-numbers') setStep('details')
              else if (step === 'details') {
                handleFinishIdentity().then(() => handleFinish())
              }
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex-1"
          >
            {step === 'details' ? 'Finish Character' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
