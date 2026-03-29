import type { Entity } from '../../lib/types'
import { FeatWizardCard } from '../entities/feat'

interface FeatStepProps {
  availableFeats: Entity[]
  selectedFeats: string[]
  featSlotsRemaining: number
  onSelectFeat: (feat: Entity) => void
  onContinue: () => void
  onBack: () => void
}

export function FeatStep({
  availableFeats,
  selectedFeats,
  featSlotsRemaining,
  onSelectFeat,
  onContinue,
  onBack,
}: FeatStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Step 7: Select a Feat</h2>
      <p className="text-gray-600">
        At 1st level, you gain a feat of your choice.
        {featSlotsRemaining > 0
          ? ` You have ${featSlotsRemaining} feat slot${featSlotsRemaining !== 1 ? 's' : ''} remaining.`
          : ' No feat slots remaining.'}
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
              <FeatWizardCard
                key={feat.id}
                entity={feat}
                selected={selectedFeats.includes(feat.id)}
                onSelect={() => onSelectFeat(feat)}
              />
            ))}
          </div>
          {availableFeats.length === 0 && (
            <p className="text-gray-500 text-sm">No feats available.</p>
          )}
        </>
      ) : null}
    </div>
  )
}
