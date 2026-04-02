import type { ReactNode } from 'react'
import type { Workflow, WorkflowState, WorkflowStep } from '../../lib/types'

interface WorkflowStepperProps {
  workflow: Workflow
  state: WorkflowState
  onNext: (stepData: Record<string, unknown>) => void
  onBack: () => void
  /** Render the content of the current step */
  children: (step: WorkflowStep, stepData: unknown) => ReactNode
}

export function WorkflowStepper({ workflow, state, onNext, onBack, children }: WorkflowStepperProps) {
  const steps = workflow.properties.steps
  const currentStepIndex = Math.min(state.currentStep, steps.length - 1)
  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  return (
    <div className="flex flex-col h-full">
      {/* Step progress bar */}
      <div className="flex gap-1 mb-6">
        {steps.map((step, i) => {
          const isComplete = state.completed.includes(step.id)
          const isCurrent = i === currentStepIndex
          return (
            <div
              key={step.id}
              data-step-segment
              className={`flex-1 h-2 rounded transition-colors ${
                isComplete
                  ? 'bg-green-600'
                  : isCurrent
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
              }`}
              title={step.name}
            />
          )
        })}
      </div>

      {/* Step heading */}
      <h2 className="text-xl font-semibold mb-4">
        {currentStep.name}
      </h2>

      {/* Step content */}
      <div className="flex-1">
        {children(currentStep, state.data[currentStep.id])}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
        <button
          onClick={onBack}
          disabled={isFirstStep}
          className="px-4 py-2 text-gray-500 disabled:opacity-30 hover:text-gray-800 transition-colors"
        >
          ← Back
        </button>
        {!isLastStep && (
          <button
            onClick={() => onNext({})}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Next →
          </button>
        )}
        {isLastStep && (
          <button
            onClick={() => onNext({})}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Complete
          </button>
        )}
      </div>
    </div>
  )
}
