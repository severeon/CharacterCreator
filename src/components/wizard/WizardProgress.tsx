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
    <div className="flex items-start mb-8">
      {stepOrder.map((s, i) => (
        /* Each step takes equal space; connector is inlined after the column */
        <div key={s} className="flex items-start flex-1">
          {/* Step column: bubble + label */}
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                completedSteps.has(s)
                  ? 'bg-blue-600 text-white'
                  : currentStep === s
                  ? 'bg-blue-100 border-2 border-blue-600'
                  : 'bg-gray-200'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs text-center mt-1 ${
                currentStep === s ? 'font-bold text-blue-600' : 'text-gray-400'
              }`}
            >
              {STEP_LABELS[s]}
            </span>
          </div>
          {/* Connector — flex-shrink-0, mt-4 aligns to bubble center (h-8 / 2) */}
          {i < stepOrder.length - 1 && (
            <div
              className={`flex-shrink-0 w-4 h-0.5 mt-4 ${
                completedSteps.has(s) ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export type { WizardStep }
