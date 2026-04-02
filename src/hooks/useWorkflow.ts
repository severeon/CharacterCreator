import type { Workflow } from '../lib/types'
import { CHARACTER_CREATION_WORKFLOW } from '../workflows/character-creation'

const WORKFLOWS: Record<string, Workflow> = {
  'srd:workflow:character-creation': CHARACTER_CREATION_WORKFLOW,
}

/**
 * Returns a workflow by ID.
 * Currently returns from a local constant registry.
 * Future: load from content pack entities via IPC.
 */
export function useWorkflow(id: string): Workflow | null {
  return WORKFLOWS[id] ?? null
}
