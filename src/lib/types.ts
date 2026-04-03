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

// --- Phase 4: UI Primitive Mapping types ---

export interface SlotConfig {
  path?: string
  label?: string
}

export interface ViewMode {
  id: string
  template: 'card' | 'reference' | 'table-row' | 'battlemap' | 'dm-screen'
  slots?: Record<string, SlotConfig>
}

export interface LayoutChild {
  id: string
  component: string
  path?: string
  formula?: string
  label?: string
  max_path?: string
  headers?: string[]
  rows_path?: string
  source_path?: string
  item_view_mode?: string
  filter?: string
}

export interface LayoutSection {
  id: string
  component: string
  title?: string
  children?: LayoutChild[]
}

export interface Layout {
  id: string
  sections: LayoutSection[]
  properties?: Record<string, Value>
}

export interface ThemeColors {
  primary?: string
  secondary?: string
  accent?: string
  background?: string
  surface?: string
  text?: string
  text_muted?: string
  error?: string
  warning?: string
  success?: string
  border?: string
  [key: string]: string | undefined
}

export interface ThemeTypography {
  heading_font?: string
  body_font?: string
  mono_font?: string
  heading_scale?: number
  body_size?: string
  line_height?: number
}

export interface ThemeSpacing {
  base_unit?: number
  component_gap?: number
  section_gap?: number
  page_margin?: number
  [key: string]: number | undefined
}

export interface ThemeEffects {
  card_shadow?: string
  border_radius?: number
  border_style?: string
}

export interface Theme {
  id: string
  properties: {
    name?: string
    colors?: ThemeColors
    typography?: ThemeTypography
    spacing?: ThemeSpacing
    effects?: ThemeEffects
  }
}

export interface Character {
  id?: string
  properties: Record<string, Value>
  computed_views?: Record<string, Value>
}
