interface RollAbilitiesStepProps {
  rolledSets: number[][]
  abilityMethod: 'manual' | 'array' | 'roll' | 'pointbuy'
  onRollAbilities: () => void
  onStandardArray: () => void
  onPointBuy: () => void
  onManualEntry: () => void
  onContinue: () => void
}

export function RollAbilitiesStep({
  rolledSets,
  abilityMethod,
  onRollAbilities,
  onStandardArray,
  onPointBuy,
  onManualEntry,
  onContinue,
}: RollAbilitiesStepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Step 1: Roll Ability Scores</h2>
      <p className="text-gray-600">
        Roll 4d6 and drop the lowest die. Repeat 6 times to generate your ability scores.
      </p>

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
          Point Buy
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

      {/* Rolled Sets Display */}
      {abilityMethod === 'roll' && rolledSets.length > 0 && rolledSets[0].length === 6 && (
        <div className="space-y-4">
          <h3 className="font-semibold">Your Rolled Ability Scores</h3>
          <p className="text-sm text-gray-500">
            These 6 scores will be available for assignment after Race and Class selection.
            You can re-roll to get new values.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {rolledSets[0].map((score, i) => (
              <div
                key={i}
                className="p-4 border rounded-lg text-center bg-white"
              >
                <span className="text-sm text-gray-500 block">Score {i + 1}</span>
                <span className="text-2xl font-bold text-blue-600">{score}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-blue-600">
            Click Continue to proceed to Race selection. You&apos;ll assign these scores after choosing your class.
          </p>
        </div>
      )}

      {/* Standard Array Preview */}
      {abilityMethod === 'array' && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">Standard Array</h3>
          <p className="text-green-700 text-sm">
            STR 15, DEX 14, CON 13, INT 12, WIS 10, CHA 8
          </p>
          <p className="text-sm text-green-600 mt-2">
            These values will be available for assignment after Race and Class selection.
          </p>
        </div>
      )}

      {/* Point Buy Info */}
      {abilityMethod === 'pointbuy' && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="font-medium text-blue-800">Point Buy: 27 points</p>
          <p className="text-blue-600 text-sm">
            Costs: 8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9, 16=12, 17=15, 18=19
          </p>
          <p className="text-sm text-blue-600 mt-1">
            You&apos;ll be able to adjust these after Race and Class selection.
          </p>
        </div>
      )}

      {/* Manual Entry Info */}
      {abilityMethod === 'manual' && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-700">
            You&apos;ll be able to enter ability scores manually after Race and Class selection.
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={onContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          Continue to Race Selection
        </button>
      </div>
    </div>
  )
}
