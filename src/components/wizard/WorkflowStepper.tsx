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
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Step progress bar */}
      <div style={{ display: 'flex', gap: '3px', padding: '10px 14px', borderBottom: '1px solid var(--gold-rule)', background: 'rgba(107,20,20,0.04)' }}>
        {steps.map((step, i) => {
          const isComplete = state.completed.includes(step.id)
          const isCurrent = i === currentStepIndex
          return (
            <div
              key={step.id}
              data-step-segment
              title={step.name}
              style={{
                flex: 1,
                height: '4px',
                background: isComplete
                  ? 'var(--gold-light)'
                  : isCurrent
                    ? 'var(--burgundy)'
                    : 'rgba(155, 120, 50, 0.2)',
                transition: 'background 0.2s',
              }}
            />
          )
        })}
      </div>

      {/* Step heading */}
      <div className="dnd-section-header" style={{ padding: '5px 14px' }}>
        {currentStep.name}
      </div>

      {/* Step content */}
      <div style={{ flex: 1, padding: '14px 14px 10px' }}>
        {children(currentStep, state.data[currentStep.id])}
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        borderTop: '1px solid var(--gold-rule)',
        background: 'var(--parchment)',
      }}>
        <button
          onClick={onBack}
          disabled={isFirstStep}
          style={{
            background: 'none',
            border: 'none',
            fontFamily: "'Cinzel', serif",
            fontSize: '0.65rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: isFirstStep ? 'rgba(92,61,30,0.3)' : 'var(--burgundy)',
            cursor: isFirstStep ? 'default' : 'pointer',
            padding: '6px 0',
          }}
        >
          ← Back
        </button>
        {!isLastStep && (
          <button
            onClick={() => onNext({})}
            style={{
              background: 'var(--burgundy)',
              border: '1px solid var(--gold-rule)',
              fontFamily: "'Cinzel', serif",
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--parchment-light)',
              padding: '6px 18px',
              cursor: 'pointer',
            }}
          >
            Next →
          </button>
        )}
        {isLastStep && (
          <button
            onClick={() => onNext({})}
            style={{
              background: 'var(--gold)',
              border: '1px solid var(--gold-light)',
              fontFamily: "'Cinzel', serif",
              fontSize: '0.65rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--parchment-light)',
              padding: '6px 18px',
              cursor: 'pointer',
            }}
          >
            Complete
          </button>
        )}
      </div>
    </div>
  )
}
