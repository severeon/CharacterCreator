import type { Entity } from '../../lib/types'

interface AssignAbilitiesStepProps {
  abilities: Record<string, number>
  abilityMethod: 'manual' | 'array' | 'roll' | 'pointbuy'
  pointBuyRemaining: number
  selectedClass: Entity | null
  onRollAbilities: () => void
  onStandardArray: () => void
  onPointBuy: () => void
  onManualEntry: () => void
  onAbilityPointBuy: (ability: string, delta: number) => void
  onAbilityManualChange: (ability: string, value: number) => void
  onAssignAbilities: () => void
  onBack: () => void
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function AssignAbilitiesStep({
  abilities,
  abilityMethod,
  pointBuyRemaining,
  selectedClass,
  onRollAbilities,
  onStandardArray,
  onPointBuy,
  onManualEntry,
  onAbilityPointBuy,
  onAbilityManualChange,
  onAssignAbilities,
  onBack,
}: AssignAbilitiesStepProps) {
  const conMod = abilityModifier(abilities.constitution || 10)
  const dexMod = abilityModifier(abilities.dexterity || 10)
  const classData = selectedClass?.properties

  const hd = classData ? (classData['hd'] as number) ?? 8 : 8
  const bab = classData ? ((classData['bab'] as string) ?? 'medium') : 'medium'
  const fortBase = classData ? ((classData['fort'] as number) ?? 0) : 0
  const refBase = classData ? ((classData['ref'] as number) ?? 0) : 0
  const willBase = classData ? ((classData['will'] as number) ?? 0) : 0

  const babTable: Record<string, number[]> = {
    good: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    medium: [0, 1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15],
    bad: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9],
  }
  const babProgression = babTable[bab] || babTable['medium']
  const currentBAB = babProgression[0]

  const hp = hd + conMod
  const initiative = dexMod
  const ac = 10 + dexMod
  const flatFooted = 10 + dexMod
  const touch = 10 + dexMod

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Step 3: Assign and Adjust Ability Scores</h2>

      {/* Method Selection Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onRollAbilities}
          className={`px-4 py-2 rounded-lg border ${
            abilityMethod === 'roll' ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'
          }`}
        >
          Roll 4d6 (×6)
        </button>
        <button
          onClick={onStandardArray}
          className={`px-4 py-2 rounded-lg border ${
            abilityMethod === 'array' ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'
          }`}
        >
          Standard Array
        </button>
        <button
          onClick={onPointBuy}
          className={`px-4 py-2 rounded-lg border ${
            abilityMethod === 'pointbuy' ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'
          }`}
        >
          Point Buy ({pointBuyRemaining} pts)
        </button>
        <button
          onClick={onManualEntry}
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
          <p className="text-blue-600">
            Costs: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9, 16=12, 17=15, 18=19
          </p>
          <p className="text-blue-600">
            Remaining: <span className="font-bold">{pointBuyRemaining}</span> points
          </p>
        </div>
      )}

      {/* Ability Score Inputs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(abilities).map(([ability, value]) => (
          <div
            key={ability}
            className="flex items-center gap-3 p-3 border rounded-lg bg-white"
          >
            <span className="w-24 font-medium capitalize">{ability}</span>
            {abilityMethod === 'pointbuy' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onAbilityPointBuy(ability, -1)}
                  disabled={value <= 8}
                  className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                >
                  −
                </button>
                <span className="w-12 text-center font-bold">{value}</span>
                <button
                  onClick={() => onAbilityPointBuy(ability, 1)}
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
                  onAbilityManualChange(ability, Math.max(1, Math.min(20, newVal)))
                }}
                min={1}
                max={20}
                className="w-20 px-2 py-1 border rounded"
              />
            )}
            <span
              className={`text-sm font-medium ${
                abilityModifier(value) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {abilityModifier(value) >= 0 ? '+' : ''}
              {abilityModifier(value)}
            </span>
          </div>
        ))}
      </div>

      {/* Derived Stats Preview */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-bold text-lg mb-3">Derived Statistics (Preview)</h3>
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
            <span
              className={`text-2xl font-bold ${
                initiative >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {initiative >= 0 ? '+' : ''}
              {initiative}
            </span>
          </div>
          <div className="bg-white p-3 rounded border">
            <span className="text-gray-600 block">Armor Class</span>
            <span className="text-2xl font-bold">{ac}</span>
            <span className="text-gray-500 text-xs block">
              Touch: {touch} / Flat: {flatFooted}
            </span>
          </div>
          <div className="bg-white p-3 rounded border">
            <span className="text-gray-600 block">Fortitude Save</span>
            <span
              className={`text-2xl font-bold ${
                fortBase + conMod >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              +{fortBase + conMod}
            </span>
          </div>
          <div className="bg-white p-3 rounded border">
            <span className="text-gray-600 block">Reflex Save</span>
            <span
              className={`text-2xl font-bold ${
                refBase + dexMod >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              +{refBase + dexMod}
            </span>
          </div>
          <div className="bg-white p-3 rounded border">
            <span className="text-gray-600 block">Will Save</span>
            <span
              className={`text-2xl font-bold ${
                willBase + abilityModifier(abilities.wisdom || 10) >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              +{willBase + abilityModifier(abilities.wisdom || 10)}
            </span>
          </div>
          <div className="bg-white p-3 rounded border">
            <span className="text-gray-600 block">Speed</span>
            <span className="text-2xl font-bold">30 ft</span>
          </div>
        </div>
      </div>
    </div>
  )
}
