type WizardStep =
  | 'roll-abilities'
  | 'race'
  | 'class'
  | 'assign-abilities'
  | 'starting-package'
  | 'racial-class-features'
  | 'skills'
  | 'feat'
  | 'description'
  | 'equipment'
  | 'combat-numbers'
  | 'details'

export const STEP_LABELS: Record<WizardStep, string> = {
  'roll-abilities': 'Roll',
  race: 'Race',
  class: 'Class',
  'assign-abilities': 'Abilities',
  'starting-package': 'Package',
  'racial-class-features': 'Features',
  skills: 'Skills',
  feat: 'Feat',
  description: 'Description',
  equipment: 'Equipment',
  'combat-numbers': 'Combat',
  details: 'Details',
}

interface WizardProgressProps {
  currentStep: WizardStep
  completedSteps: Set<WizardStep>
  stepOrder: WizardStep[]
}

export function WizardProgress({ currentStep, completedSteps, stepOrder }: WizardProgressProps) {
  return (
    <div className="mb-8">
      {/* Bubbles row */}
      <div className="flex items-center">
        {stepOrder.map((s, i) => (
          <div key={s} className="flex items-center">
            {/* Bubble */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                completedSteps.has(s)
                  ? 'bg-blue-600 text-white'
                  : currentStep === s
                  ? 'bg-blue-100 border-2 border-blue-600'
                  : 'bg-gray-200'
              }`}
            >
              {i + 1}
            </div>
            {/* Connector */}
            {i < stepOrder.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 ${
                  completedSteps.has(s) ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      {/* Labels row - same structure as bubbles but only the bubble part */}
      <div className="flex mt-2 text-sm">
        {stepOrder.map((s, i) => (
          <div key={s} className="flex items-center">
            {/* Label - w-8 matches bubble width, mx-1 matches connector margin */}
            <span
              className={`w-8 text-center capitalize flex-shrink-0 ${
                currentStep === s ? 'font-bold text-blue-600' : 'text-gray-400'
              }`}
            >
              {STEP_LABELS[s]}
            </span>
            {/* Spacer to match connector width */}
            {i < stepOrder.length - 1 && <div className="w-8 mx-1" />}
          </div>
        ))}
      </div>
    </div>
  )
}

export type { WizardStep }
