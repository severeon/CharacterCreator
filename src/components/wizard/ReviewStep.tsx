import type { Entity } from '../../lib/types'
import { getPropertyString } from '../../lib/properties'

interface ReviewStepProps {
  characterName: string
  selectedRace: Entity | null
  selectedClass: Entity | null
  abilities: Record<string, number>
  onFinish: () => void
  onBack: () => void
}

export function ReviewStep({
  characterName,
  selectedRace,
  selectedClass,
  abilities,
  onFinish,
  onBack,
}: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Review Your Character</h2>
      <div className="bg-gray-50 p-6 rounded-lg space-y-2">
        <p>
          <strong>Name:</strong> {characterName}
        </p>
        <p>
          <strong>Race:</strong>{' '}
          {selectedRace
            ? getPropertyString(selectedRace.properties, 'name', 'Unknown')
            : 'Not selected'}
        </p>
        <p>
          <strong>Class:</strong>{' '}
          {selectedClass
            ? getPropertyString(selectedClass.properties, 'name', 'Unknown')
            : 'None'}
        </p>
        <hr className="my-2" />
        <p className="text-sm text-gray-500 font-semibold">Ability Scores:</p>
        {Object.entries(abilities).map(([ability, value]) => (
          <p key={ability}>
            <strong className="capitalize">{ability}:</strong> {value} (
            {(value - 10) / 2 >= 0 ? '+' : ''}
            {Math.floor((value - 10) / 2)})
          </p>
        ))}
      </div>
      <div className="flex gap-4">
        <button onClick={onBack} className="px-6 py-2 border rounded-lg">
          Back
        </button>
        <button
          onClick={onFinish}
          className="px-6 py-2 bg-green-600 text-white rounded-lg"
        >
          Finish Character
        </button>
      </div>
    </div>
  )
}
