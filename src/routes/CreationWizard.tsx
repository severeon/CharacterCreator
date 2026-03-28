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

type WizardStep = 'name' | 'race' | 'class' | 'abilities' | 'skills' | 'feats' | 'review'

const STEP_ORDER: WizardStep[] = ['name', 'race', 'class', 'abilities', 'skills', 'feats', 'review']

function getPropertyString(properties: Record<string, unknown>, key: string, fallback: string): string {
  const val = properties[key]
  if (val === null || val === undefined) return fallback
  if (typeof val === 'string') return val
  if (typeof val === 'number') return val.toString()
  return fallback
}

function getPropertyNumber(properties: Record<string, unknown>, key: string, fallback: number): number {
  const val = properties[key]
  if (typeof val === 'number') return val
  return fallback
}

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
  const [abilities, setAbilities] = useState<Record<string, number>>({
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  })
  const [availableFeats, setAvailableFeats] = useState<Entity[]>([])
  const [selectedFeats, setSelectedFeats] = useState<string[]>([])
  const [featSlotsRemaining, setFeatSlotsRemaining] = useState(1)
  const [skillPointsRemaining, setSkillPointsRemaining] = useState(0)
  const [skillAllocations, setSkillAllocations] = useState<Record<string, number>>({})
  const [classSkillNames, setClassSkillNames] = useState<string[]>([])
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({ completed: [], pending: [], available: [] })

  // Ability score method: 'manual' | 'array' | 'roll' | 'pointbuy'
  const [abilityMethod, setAbilityMethod] = useState<'manual' | 'array' | 'roll' | 'pointbuy'>('manual')
  const [pointBuyRemaining, setPointBuyRemaining] = useState(27)

  // D&D 3.5e Point Buy cost table (cost to increase from 8)
  const POINT_BUY_COST: Record<number, number> = {
    8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9, 16: 12, 17: 15, 18: 19
  }

  function roll4d6DropLowest(): number {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1)
    rolls.sort((a, b) => a - b)
    return rolls[1] + rolls[2] + rolls[3] // Drop lowest (first) and sum top 3
  }

  function handleRollAbilities() {
    setAbilityMethod('roll')
    // Roll and show result (in a real implementation, you'd use these rolls for assignment)
    const rolls = Array.from({ length: 6 }, () => roll4d6DropLowest())
    // For now, just set a random arrangement
    const abilities_order = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']
    const newAbilities: Record<string, number> = {}
    rolls.sort((a, b) => b - a).forEach((roll, i) => {
      newAbilities[abilities_order[i]] = roll
    })
    setAbilities(newAbilities)
  }

  function handleStandardArray() {
    setAbilityMethod('array')
    setAbilities({ strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 })
  }

  function handlePointBuy() {
    setAbilityMethod('pointbuy')
    setPointBuyRemaining(27)
    setAbilities({ strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 })
  }

  function handleAbilityPointBuy(ability: string, delta: number) {
    setAbilities(prev => {
      const current = prev[ability] || 8
      const newValue = Math.max(8, Math.min(18, current + delta))
      if (newValue === current) return prev

      const oldCost = POINT_BUY_COST[current] || 0
      const newCost = POINT_BUY_COST[newValue] || 0
      const costDiff = newCost - oldCost

      if (costDiff > pointBuyRemaining && delta > 0) return prev

      setPointBuyRemaining(prev => Math.max(0, prev - costDiff))
      return { ...prev, [ability]: newValue }
    })
  }

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
    // Load races and classes independently with per-section error handling
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

    const pointsPerLevel = getPropertyNumber(character.properties, 'skill_points_per_level', 2)
    const remaining = getPropertyNumber(character.properties, 'skill_points_remaining', pointsPerLevel)
    setSkillPointsRemaining(remaining)

    // Load class entity to get classSkills
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

    // Load existing skill allocations
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
      setSelectedFeats(Array.isArray(selected) ? selected as string[] : [])
    }
  }

  async function handleStartCreation() {
    if (!characterName.trim()) return
    const id = await createCharacter(characterName)
    setCharacterId(id)

    // Update character with identity fields
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

    // Refresh workflow status with the new character ID
    try {
      const status = await getWorkflowStatus(id, 'srd:workflow:character_creation')
      setWorkflowStatus(status)
      // Advance to the first pending step
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

  async function handleSelectClass(classEntity: Entity, slot: 'A' | 'B' = 'A') {
    if (!characterId) return
    await selectClass(characterId, classEntity.id, 1, slot)
    if (slot === 'A') {
      setSelectedClass(classEntity)
    } else {
      setSelectedClassB(classEntity)
    }
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

    // Estimate total cost across all skills
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
      // Revert on error
      setSkillAllocations(skillAllocations)
      setSkillPointsRemaining(
        skillPointsRemaining + delta * cost
      )
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

  function handleFinish() {
    if (characterId) {
      navigate(`/character/${characterId}`)
    }
  }

  function renderStep() {
    switch (step) {
      case 'name':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Character Identity</h2>

            {/* Basic Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Character Name</label>
                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="Enter character name..."
                  className="w-full px-4 py-2 border rounded-lg"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Player Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your name..."
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Alignment Grid */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alignment</label>
              <div className="inline-grid grid-cols-3 gap-1 border border-gray-300 rounded-lg p-1 bg-gray-50">
                {[
                  ['lawful-good', 'Lawful Good', 'LG'],
                  ['neutral-good', 'Neutral Good', 'NG'],
                  ['chaotic-good', 'Chaotic Good', 'CG'],
                  ['lawful-neutral', 'Lawful Neutral', 'LN'],
                  ['neutral', 'Neutral', 'N'],
                  ['chaotic-neutral', 'Chaotic Neutral', 'CN'],
                  ['lawful-evil', 'Lawful Evil', 'LE'],
                  ['neutral-evil', 'Neutral Evil', 'NE'],
                  ['chaotic-evil', 'Chaotic Evil', 'CE'],
                ].map(([value, label, abbrev]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAlignment(value as string)}
                    className={`px-3 py-2 text-sm rounded-md transition-colors ${
                      alignment === value
                        ? 'bg-blue-600 text-white font-medium'
                        : 'hover:bg-gray-200'
                    }`}
                  >
                    <span className="block text-xs opacity-75">{abbrev}</span>
                    <span className="block text-xs">{label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Deity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deity</label>
              <input
                type="text"
                value={deity}
                onChange={(e) => setDeity(e.target.value)}
                placeholder="Your deity (optional)..."
                className="w-full max-w-md px-4 py-2 border rounded-lg"
              />
            </div>

            {/* Physical Characteristics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height (inches)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="e.g. 72"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (lbs)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 180"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Appearance */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Eyes</label>
                <input
                  type="text"
                  value={eyes}
                  onChange={(e) => setEyes(e.target.value)}
                  placeholder="Eye color..."
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hair</label>
                <input
                  type="text"
                  value={hair}
                  onChange={(e) => setHair(e.target.value)}
                  placeholder="Hair color..."
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skin</label>
                <input
                  type="text"
                  value={skin}
                  onChange={(e) => setSkin(e.target.value)}
                  placeholder="Skin tone..."
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Appearance & Background */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Appearance</label>
              <textarea
                value={appearance}
                onChange={(e) => setAppearance(e.target.value)}
                placeholder="Describe your character's physical appearance..."
                rows={3}
                className="w-full max-w-2xl px-4 py-2 border rounded-lg resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Background</label>
              <textarea
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="Describe your character's history and background..."
                rows={3}
                className="w-full max-w-2xl px-4 py-2 border rounded-lg resize-none"
              />
            </div>

            <button
              onClick={handleStartCreation}
              disabled={!characterName.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              Start Creating
            </button>
          </div>
        )

      case 'race':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Choose Your Race</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {races.map((race) => (
                <button
                  key={race.id}
                  onClick={() => handleSelectRace(race)}
                  className="p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left"
                >
                  <h3 className="font-bold">{getPropertyString(race.properties, 'name', race.id)}</h3>
                  {getPropertyString(race.properties, 'size', '') && (
                    <p className="text-sm text-gray-600">Size: {getPropertyString(race.properties, 'size', '')}</p>
                  )}
                  {getPropertyString(race.properties, 'speed', '') && (
                    <p className="text-sm text-gray-600">Speed: {getPropertyString(race.properties, 'speed', '')}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )

      case 'class':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Choose Your Class</h2>

            {/* Gestalt Toggle */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGestalt}
                  onChange={(e) => {
                    setIsGestalt(e.target.checked)
                    if (!e.target.checked) {
                      setSelectedClassB(null)
                    }
                  }}
                  className="w-5 h-5 rounded"
                />
                <span className="font-medium">Enable Gestalt (Dual-Class)</span>
              </label>
              {isGestalt && (
                <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  Both classes advance together each level
                </span>
              )}
            </div>

            {/* Class A Selection */}
            <div>
              <h3 className="font-semibold mb-2">
                Class A {isGestalt && '(Primary)'}
                {selectedClass && (
                  <span className="ml-2 text-green-600">✓ {getPropertyString(selectedClass.properties, 'name', selectedClass.id)}</span>
                )}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setSelectedClass(cls)
                      handleSelectClass(cls, 'A')
                    }}
                    className={`p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left ${
                      selectedClass?.id === cls.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <h4 className="font-bold text-sm">{getPropertyString(cls.properties, 'name', cls.id)}</h4>
                    <p className="text-xs text-gray-600">
                      HD: d{getPropertyNumber(cls.properties, 'hd', 8)} | BAB: {getPropertyString(cls.properties, 'bab', 'med')}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Class B Selection (Gestalt only) */}
            {isGestalt && (
              <div>
                <h3 className="font-semibold mb-2">
                  Class B (Secondary)
                  {selectedClassB && (
                    <span className="ml-2 text-green-600">✓ {getPropertyString(selectedClassB.properties, 'name', selectedClassB.id)}</span>
                  )}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {classes.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => {
                        setSelectedClassB(cls)
                        if (selectedClass) handleSelectClass(cls, 'B')
                      }}
                      className={`p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left ${
                        selectedClassB?.id === cls.id ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                    >
                      <h4 className="font-bold text-sm">{getPropertyString(cls.properties, 'name', cls.id)}</h4>
                      <p className="text-xs text-gray-600">
                        HD: d{getPropertyNumber(cls.properties, 'hd', 8)} | BAB: {getPropertyString(cls.properties, 'bab', 'med')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Gestalt Summary */}
            {isGestalt && selectedClass && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-bold text-purple-800 mb-3">Gestalt Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-purple-600 block">ECL</span>
                    <span className="text-xl font-bold">2</span>
                    <span className="text-xs text-purple-500">(1 character + 1 class level)</span>
                  </div>
                  <div>
                    <span className="text-purple-600 block">Hit Dice</span>
                    <span className="text-xl font-bold">
                      2d{getPropertyNumber(selectedClass.properties, 'hd', 8)}
                      {selectedClassB && ` + 1d${getPropertyNumber(selectedClassB.properties, 'hd', 8)}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-purple-600 block">BAB</span>
                    <span className="text-xl font-bold">Full</span>
                    <span className="text-xs text-purple-500">(Best of both)</span>
                  </div>
                  <div>
                    <span className="text-purple-600 block">Saves</span>
                    <span className="text-xl font-bold">Best</span>
                    <span className="text-xs text-purple-500">(Best of each pair)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep('race')}
                className="px-6 py-2 border rounded-lg"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (!isGestalt && selectedClass) {
                    handleSelectClass(selectedClass, 'A')
                  } else if (isGestalt && selectedClass && selectedClassB) {
                    handleSelectClass(selectedClass, 'A')
                    setTimeout(() => handleSelectClass(selectedClassB!, 'B'), 100)
                  }
                }}
                disabled={!selectedClass || (isGestalt && !selectedClassB)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )

      case 'abilities': {
        const abilityModifier = (score: number) => Math.floor((score - 10) / 2)
        const conMod = abilityModifier(abilities.constitution || 10)
        const dexMod = abilityModifier(abilities.dexterity || 10)
        const classData = selectedClass?.properties

        // Calculate derived stats based on selected class
        const hd = classData ? getPropertyNumber(classData, 'hd', 8) : 8
        const bab = classData ? getPropertyString(classData, 'bab', 'medium') : 'medium'
        const fortBase = classData ? getPropertyNumber(classData, 'fort', 0) : 0
        const refBase = classData ? getPropertyNumber(classData, 'ref', 0) : 0
        const willBase = classData ? getPropertyNumber(classData, 'will', 0) : 0

        // BAB progression multipliers (for gestalt, we'll use full BAB)
        const babTable: Record<string, number[]> = {
          'good': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
          'medium': [0, 1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15],
          'bad': [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9]
        }
        const babProgression = babTable[bab] || babTable['medium']
        const currentBAB = babProgression[0] // Level 1

        const hp = hd + conMod
        const initiative = dexMod
        const ac = 10 + dexMod
        const flatFooted = 10 + dexMod
        const touch = 10 + dexMod

        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Assign Ability Scores</h2>

            {/* Method Selection Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleRollAbilities}
                className={`px-4 py-2 rounded-lg border ${
                  abilityMethod === 'roll' ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                Roll 4d6 (×6)
              </button>
              <button
                onClick={handleStandardArray}
                className={`px-4 py-2 rounded-lg border ${
                  abilityMethod === 'array' ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                Standard Array
              </button>
              <button
                onClick={handlePointBuy}
                className={`px-4 py-2 rounded-lg border ${
                  abilityMethod === 'pointbuy' ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                Point Buy ({pointBuyRemaining} pts)
              </button>
              <button
                onClick={() => setAbilityMethod('manual')}
                className={`px-4 py-2 rounded-lg border ${
                  abilityMethod === 'manual' ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                Manual
              </button>
            </div>

            {/* Point Buy Info */}
            {abilityMethod === 'pointbuy' && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <p className="font-medium text-blue-800">Point Buy: 27 points</p>
                <p className="text-blue-600">Costs: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9, 16=12, 17=15, 18=19</p>
                <p className="text-blue-600">Remaining: <span className="font-bold">{pointBuyRemaining}</span> points</p>
              </div>
            )}

            {/* Ability Score Inputs */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(abilities).map(([ability, value]) => (
                <div key={ability} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                  <span className="w-24 font-medium capitalize">{ability}</span>
                  {abilityMethod === 'pointbuy' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAbilityPointBuy(ability, -1)}
                        disabled={value <= 8}
                        className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                      >
                        −
                      </button>
                      <span className="w-12 text-center font-bold">{value}</span>
                      <button
                        onClick={() => handleAbilityPointBuy(ability, 1)}
                        disabled={value >= 18 || pointBuyRemaining <= 0}
                        className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => {
                        const newVal = parseInt(e.target.value) || 10
                        setAbilities(prev => ({ ...prev, [ability]: Math.max(1, Math.min(20, newVal)) }))
                      }}
                      min={1}
                      max={20}
                      className="w-20 px-2 py-1 border rounded"
                    />
                  )}
                  <span className={`text-sm font-medium ${
                    abilityModifier(value) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {abilityModifier(value) >= 0 ? '+' : ''}{abilityModifier(value)}
                  </span>
                </div>
              ))}
            </div>

            {/* Derived Stats */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold text-lg mb-3">Derived Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-white p-3 rounded border">
                  <span className="text-gray-600 block">Hit Points</span>
                  <span className="text-2xl font-bold text-red-600">{hp}</span>
                  <span className="text-gray-500 text-xs block">HD: d{hd}</span>
                </div>
                <div className="bg-white p-3 rounded border">
                  <span className="text-gray-600 block">Base Attack</span>
                  <span className="text-2xl font-bold text-blue-600">+{currentBAB}</span>
                </div>
                <div className="bg-white p-3 rounded border">
                  <span className="text-gray-600 block">Initiative</span>
                  <span className={`text-2xl font-bold ${initiative >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {initiative >= 0 ? '+' : ''}{initiative}
                  </span>
                </div>
                <div className="bg-white p-3 rounded border">
                  <span className="text-gray-600 block">Armor Class</span>
                  <span className="text-2xl font-bold">{ac}</span>
                  <span className="text-gray-500 text-xs block">Touch: {touch} / Flat: {flatFooted}</span>
                </div>
                <div className="bg-white p-3 rounded border">
                  <span className="text-gray-600 block">Fortitude Save</span>
                  <span className={`text-2xl font-bold ${fortBase + conMod >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    +{fortBase + conMod}
                  </span>
                </div>
                <div className="bg-white p-3 rounded border">
                  <span className="text-gray-600 block">Reflex Save</span>
                  <span className={`text-2xl font-bold ${refBase + dexMod >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    +{refBase + dexMod}
                  </span>
                </div>
                <div className="bg-white p-3 rounded border">
                  <span className="text-gray-600 block">Will Save</span>
                  <span className={`text-2xl font-bold ${willBase + (abilityModifier(abilities.wisdom || 10)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    +{willBase + abilityModifier(abilities.wisdom || 10)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded border">
                  <span className="text-gray-600 block">Speed</span>
                  <span className="text-2xl font-bold">30 ft</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('class')}
                className="px-6 py-2 border rounded-lg"
              >
                Back
              </button>
              <button
                onClick={handleAssignAbilities}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        )
      }

      case 'skills': {
        const level = 1
        const allSkills = [
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
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Allocate Skill Points</h2>
            <p className="text-gray-600">
              <strong>{skillPointsRemaining}</strong> skill points remaining
            </p>
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Skill</th>
                    <th className="px-3 py-2 text-left font-semibold">Key</th>
                    <th className="px-3 py-2 text-center font-semibold">Ranks</th>
                    <th className="px-3 py-2 text-center font-semibold">Cost</th>
                    <th className="px-3 py-2 text-center font-semibold">Allocate</th>
                  </tr>
                </thead>
                <tbody>
                  {allSkills.map((skill) => {
                    const isClassSkill = classSkillNames.some(
                      (cs) => cs.toLowerCase() === skill.name.toLowerCase()
                    )
                    const cost = isClassSkill ? 1 : 2
                    const maxRanks = isClassSkill ? level : Math.floor(level / 2)
                    const currentRanks = skillAllocations[skill.name] || 0
                    const abilityMod = abilities[skill.ability.toLowerCase() as keyof typeof abilities] ?? 10
                    const modValue = Math.floor((abilityMod - 10) / 2)
                    const totalBonus = currentRanks + modValue

                    return (
                      <tr key={skill.name} className="border-t">
                        <td className="px-3 py-1.5">
                          <span className={isClassSkill ? 'font-medium' : 'text-gray-500'}>
                            {skill.name}
                          </span>
                          {isClassSkill && (
                            <span className="ml-1 text-xs text-green-600 font-medium">Class</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500">{skill.ability}</td>
                        <td className="px-3 py-1.5 text-center">
                          {currentRanks > 0 ? (
                            <span>
                              <span className="font-bold">{currentRanks}</span>
                              <span className="text-gray-400">+{modValue >= 0 ? modValue : modValue} = {totalBonus >= 0 ? '+' : ''}{totalBonus}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">{modValue >= 0 ? '+' : ''}{modValue}</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center text-gray-500">{cost}</td>
                        <td className="px-3 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleAllocateSkill(skill.name, -1)}
                              disabled={currentRanks <= 0}
                              className="w-7 h-7 rounded border text-center font-bold disabled:opacity-30 hover:bg-gray-100"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-medium">{currentRanks}</span>
                            <button
                              onClick={() => handleAllocateSkill(skill.name, 1)}
                              disabled={currentRanks >= maxRanks || skillPointsRemaining < cost}
                              className="w-7 h-7 rounded border text-center font-bold disabled:opacity-30 hover:bg-gray-100"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setStep('abilities')}
                className="px-6 py-2 border rounded-lg"
              >
                Back
              </button>
              <button
                onClick={async () => {
                  await refreshWorkflowStatus()
                  setStep('review')
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        )
      }

      case 'feats':
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Select Feats</h2>
            <p className="text-gray-600">
              {featSlotsRemaining > 0
                ? `You have ${featSlotsRemaining} feat slot${featSlotsRemaining !== 1 ? 's' : ''} remaining.`
                : 'No feat slots remaining.'}
            </p>
            {selectedFeats.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-500">Selected Feats:</p>
                <ul className="list-disc list-inside text-sm">
                  {selectedFeats.map((featId) => (
                    <li key={featId}>{featId}</li>
                  ))}
                </ul>
              </div>
            )}
            {featSlotsRemaining > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {availableFeats.map((feat) => (
                    <button
                      key={feat.id}
                      onClick={() => handleSelectFeat(feat)}
                      className="p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left"
                    >
                      <h3 className="font-bold">{getPropertyString(feat.properties, 'name', feat.id)}</h3>
                      {getPropertyString(feat.properties, 'benefit', '') && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {getPropertyString(feat.properties, 'benefit', '')}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
                {availableFeats.length === 0 && (
                  <p className="text-gray-500 text-sm">No feats available.</p>
                )}
              </>
            ) : null}
            <div className="flex gap-4">
              <button
                onClick={() => setStep('abilities')}
                className="px-6 py-2 border rounded-lg"
              >
                Back
              </button>
              <button
                onClick={async () => {
                  await refreshWorkflowStatus()
                  setStep('review')
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Review Your Character</h2>
            <div className="bg-gray-50 p-6 rounded-lg space-y-2">
              <p><strong>Name:</strong> {characterName}</p>
              <p><strong>Race:</strong> {selectedRace ? getPropertyString(selectedRace.properties, 'name', 'Unknown') : 'Not selected'}</p>
              <p><strong>Class:</strong> {selectedClass ? getPropertyString(selectedClass.properties, 'name', 'Unknown') : 'None'}</p>
              <hr className="my-2" />
              <p className="text-sm text-gray-500 font-semibold">Ability Scores:</p>
              {Object.entries(abilities).map(([ability, value]) => (
                <p key={ability}>
                  <strong className="capitalize">{ability}:</strong> {value} ({(value - 10) / 2 >= 0 ? '+' : ''}{Math.floor((value - 10) / 2)})
                </p>
              ))}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setStep('abilities')}
                className="px-6 py-2 border rounded-lg"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                className="px-6 py-2 bg-green-600 text-white rounded-lg"
              >
                Finish Character
              </button>
            </div>
          </div>
        )

      default:
        return null
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

  // Determine which wizard steps are completed based on workflow engine state
  const completedWizardSteps = new Set(
    workflowStatus.completed
      .map((ws) => WORKFLOW_STEP_MAP[ws])
      .filter((ws): ws is WizardStep => ws !== undefined)
  )

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Create New Character</h1>

      <div className="mb-8">
        {/* Bubbles row */}
        <div className="flex items-center">
          {STEP_ORDER.map((s, i) => (
            <div key={s} className="flex items-center">
              {/* Bubble */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  completedWizardSteps.has(s)
                    ? 'bg-blue-600 text-white'
                    : step === s
                    ? 'bg-blue-100 border-2 border-blue-600'
                    : 'bg-gray-200'
                }`}
              >
                {i + 1}
              </div>
              {/* Connector */}
              {i < STEP_ORDER.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 ${
                    completedWizardSteps.has(s) ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        {/* Labels row - same structure as bubbles but only the bubble part */}
        <div className="flex mt-2 text-sm">
          {STEP_ORDER.map((s, i) => (
            <div key={s} className="flex items-center">
              {/* Label - w-8 matches bubble width, mx-1 matches connector margin */}
              <span
                className={`w-8 text-center capitalize flex-shrink-0 ${
                  step === s ? 'font-bold text-blue-600' : 'text-gray-400'
                }`}
              >
                {s}
              </span>
              {/* Spacer to match connector width */}
              {i < STEP_ORDER.length - 1 && <div className="w-8 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">{renderStep()}</div>
    </div>
  )
}
