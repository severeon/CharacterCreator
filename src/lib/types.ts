import type { ReactNode } from 'react'

// --- Display primitive prop types ---

export interface BadgeProps {
  variant?: 'amber' | 'blue' | 'purple' | 'gray'
  children: ReactNode
}

export interface BulletListProps<T = unknown> {
  items: T[]
  renderItem?: (item: T, index: number) => ReactNode
  spacing?: 'tight' | 'normal'
}

export interface KeyValueProps {
  label: string
  value: ReactNode
  layout?: 'row' | 'inline' | 'block'
}

export interface DetailSectionProps {
  title: string
  children: ReactNode
  spacing?: 'tight' | 'normal'
}

// ---

export type Value =
  | null
  | boolean
  | number
  | string
  | Value[]
  | { [key: string]: Value }

export interface Entity {
  id: string
  entity_type: string
  properties: Record<string, Value>
  tags: string[]
  mdx_body: string
  source_pack: string
}

export interface EntitySummary {
  id: string
  entity_type: string
  name: string
  tags: string[]
}

export interface WorkflowStatus {
  completed: string[]
  pending: string[]
  available: string[]
}

export interface WorkflowStep {
  id: string
  name: string
  component: string
  config: Record<string, unknown>
  required: boolean
  depends_on?: string[]
  repeatable?: boolean
}

export interface Workflow {
  id: string
  properties: {
    name: string
    completion_creates?: string
    steps: WorkflowStep[]
  }
}

export interface WorkflowState {
  currentStep: number
  completed: string[]
  data: Record<string, unknown>
}
