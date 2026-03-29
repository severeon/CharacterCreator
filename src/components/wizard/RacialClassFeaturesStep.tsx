import type { Entity } from '../../lib/types'

interface RacialClassFeaturesStepProps {
  selectedRace: Entity | null
  selectedClass: Entity | null
  onContinue: () => void
  onBack: () => void
}

export function RacialClassFeaturesStep({
  selectedRace,
  selectedClass,
  onContinue,
  onBack,
}: RacialClassFeaturesStepProps) {
  const raceName = (selectedRace?.properties['name'] as string) ?? 'Unknown Race'
  const className = (selectedClass?.properties['name'] as string) ?? 'Unknown Class'
  const raceTraits = selectedRace?.properties['traits'] as string[] | undefined
  const classFeatures = selectedClass?.properties['features'] as string[] | undefined
  const ecl = selectedRace?.properties['ecl']
  const hd = selectedClass?.properties['hd']
  const bab = selectedClass?.properties['bab']
  const fort = selectedClass?.properties['fort']
  const ref = selectedClass?.properties['ref']
  const will = selectedClass?.properties['will']

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Step 5: Record Racial and Class Features</h2>
      <p className="text-gray-600">
        Review the features gained from your race and class.
      </p>

      {/* Racial Traits */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-bold text-xl mb-3 text-blue-800">Racial Traits: {raceName}</h3>
        {raceTraits && raceTraits.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {raceTraits.map((trait, i) => (
              <li key={i} className="text-gray-700">{trait}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic">No traits listed</p>
        )}
        {ecl !== undefined && (
          <p className="mt-2 text-sm">
            <strong>Effective Character Level (ECL):</strong> {String(ecl)}
          </p>
        )}
      </div>

      {/* Class Features */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-bold text-xl mb-3 text-green-800">Class Features: {className}</h3>
        {classFeatures && classFeatures.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {classFeatures.map((feature, i) => (
              <li key={i} className="text-gray-700">{feature}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic">No features listed</p>
        )}
        {hd !== undefined && (
          <p className="mt-2 text-sm">
            <strong>Hit Die:</strong> d{String(hd)}
          </p>
        )}
        {bab !== undefined && (
          <p className="text-sm">
            <strong>Base Attack Bonus:</strong> {String(bab)}
          </p>
        )}
        {fort !== undefined && (
          <p className="text-sm">
            <strong>Fortitude Save:</strong> +{String(fort)}
          </p>
        )}
        {ref !== undefined && (
          <p className="text-sm">
            <strong>Reflex Save:</strong> +{String(ref)}
          </p>
        )}
        {will !== undefined && (
          <p className="text-sm">
            <strong>Will Save:</strong> +{String(will)}
          </p>
        )}
      </div>
    </div>
  )
}
