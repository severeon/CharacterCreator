// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { WorkflowStepper } from './WorkflowStepper'
import type { Workflow, WorkflowState } from '../../lib/types'

const mockWorkflow: Workflow = {
  id: 'test:workflow:simple',
  properties: {
    name: 'Simple Workflow',
    steps: [
      {
        id: 'step-1',
        name: 'First Step',
        component: 'text-form',
        config: { fields: ['name'] },
        required: true,
      },
      {
        id: 'step-2',
        name: 'Second Step',
        component: 'entity-selector',
        config: { entity_type: 'template.race' },
        required: true,
        depends_on: ['step-1'],
      },
      {
        id: 'step-3',
        name: 'Optional Step',
        component: 'text-form',
        config: { fields: ['notes'] },
        required: false,
        depends_on: ['step-2'],
      },
    ],
  },
}

const baseState: WorkflowState = {
  currentStep: 0,
  completed: [],
  data: {},
}

const noop = () => <div />

describe('WorkflowStepper', () => {
  it('renders the step name of the current step', () => {
    render(
      <WorkflowStepper workflow={mockWorkflow} state={baseState} onNext={() => {}} onBack={() => {}}>{noop}</WorkflowStepper>
    )
    expect(screen.getByText('First Step')).toBeTruthy()
  })

  it('shows step 2 name when currentStep is 1', () => {
    const state: WorkflowState = { ...baseState, currentStep: 1 }
    render(
      <WorkflowStepper workflow={mockWorkflow} state={state} onNext={() => {}} onBack={() => {}}>{noop}</WorkflowStepper>
    )
    expect(screen.getByText('Second Step')).toBeTruthy()
  })

  it('does not show step 2 name when on step 1', () => {
    render(
      <WorkflowStepper workflow={mockWorkflow} state={baseState} onNext={() => {}} onBack={() => {}}>{noop}</WorkflowStepper>
    )
    expect(screen.queryByText('Second Step')).toBeNull()
  })

  it('renders a progress segment for each step', () => {
    render(
      <WorkflowStepper workflow={mockWorkflow} state={baseState} onNext={() => {}} onBack={() => {}}>{noop}</WorkflowStepper>
    )
    const segments = document.querySelectorAll('[data-step-segment]')
    expect(segments.length).toBe(3)
  })

  it('Back button is disabled on first step', () => {
    render(
      <WorkflowStepper workflow={mockWorkflow} state={baseState} onNext={() => {}} onBack={() => {}}>{noop}</WorkflowStepper>
    )
    const backBtn = screen.getByRole('button', { name: /back/i })
    expect(backBtn.hasAttribute('disabled')).toBe(true)
  })

  it('shows Complete button on last step', () => {
    const state: WorkflowState = { ...baseState, currentStep: 2 }
    render(
      <WorkflowStepper workflow={mockWorkflow} state={state} onNext={() => {}} onBack={() => {}}>{noop}</WorkflowStepper>
    )
    expect(screen.getByRole('button', { name: /complete/i })).toBeTruthy()
  })
})
