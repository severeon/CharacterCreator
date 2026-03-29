import type { Entity } from '../../lib/types'
import { getPropertyString } from '../../lib/properties'

interface StartingPackageStepProps {
  selectedClass: Entity | null
  onAccept: () => void
  onCustomize: () => void
  onBack: () => void
}

export function StartingPackageStep({
  selectedClass,
  onAccept,
  onCustomize,
  onBack,
}: StartingPackageStepProps) {
  const className = selectedClass
    ? getPropertyString(selectedClass.properties, 'name', 'Unknown Class')
    : 'Unknown Class'

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Step 4: Review the Starting Package</h2>
      <p className="text-gray-600">
        Each class description includes a starting package with suggested skills, feats, and equipment.
        Review the {className}&apos;s starting package below.
      </p>

      {/* Starting Package Display */}
      <div className="bg-gray-50 p-6 rounded-lg space-y-4">
        <div>
          <h3 className="font-bold text-lg">Class: {className}</h3>
          <p className="text-gray-600 text-sm">
            Review the suggested selections below. If you like these choices, accept them to quickly
            complete character creation. Otherwise, customize your selections.
          </p>
        </div>

        <hr />

        <div>
          <h4 className="font-semibold">Suggested Skills</h4>
          <p className="text-gray-700">
            The starting package suggests specific skills based on your class&apos;s strengths.
          </p>
        </div>

        <div>
          <h4 className="font-semibold">Suggested Feat</h4>
          <p className="text-gray-700">
            Most starting packages include a feat appropriate for the class.
          </p>
        </div>

        <div>
          <h4 className="font-semibold">Suggested Equipment</h4>
          <p className="text-gray-700">
            Standard equipment bundle for adventuring.
          </p>
        </div>

        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
          <p className="text-yellow-800 text-sm">
            <strong>Note:</strong> Starting package functionality is a preview. Full integration
            with class-specific starting packages coming soon. For now, you can accept to use
            default selections or customize your own.
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={onBack} className="px-6 py-2 border rounded-lg">
          Back
        </button>
        <button
          onClick={onCustomize}
          className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
        >
          Customize My Own
        </button>
        <button
          onClick={onAccept}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg"
        >
          Accept Starting Package
        </button>
      </div>
    </div>
  )
}
