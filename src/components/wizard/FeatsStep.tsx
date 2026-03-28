import type { Entity } from '../../lib/types'
import { getPropertyString } from '../../lib/properties'

interface FeatsStepProps {
  availableFeats: Entity[]
  selectedFeats: string[]
  featSlotsRemaining: number
  onSelectFeat: (feat: Entity) => void
  onContinue: () => void
  onBack: () => void
}

export function FeatsStep({
  availableFeats,
  selectedFeats,
  featSlotsRemaining,
  onSelectFeat,
  onContinue,
  onBack,
}: FeatsStepProps) {
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
                onClick={() => onSelectFeat(feat)}
                className="p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left"
              >
                <h3 className="font-bold">
                  {getPropertyString(feat.properties, 'name', feat.id)}
                </h3>
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
        <button onClick={onBack} className="px-6 py-2 border rounded-lg">
          Back
        </button>
        <button
          onClick={onContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
