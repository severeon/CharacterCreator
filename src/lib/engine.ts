import { ipc, ipcOnly } from './platform'
import type { Entity, EntitySummary } from './types'

export async function getEntitiesByType(entityType: string): Promise<EntitySummary[]> {
  return ipc('get_entities_by_type', { entityType }, `/_entities/by-type/${encodeURIComponent(entityType)}`)
}

export async function getEntityById(id: string): Promise<Entity | null> {
  return ipc('get_entity_by_id', { id }, `/_entities/by-id/${encodeURIComponent(id)}`)
}

export async function searchEntities(query: string): Promise<EntitySummary[]> {
  return ipc('search_entities', { query }, `/_entities/search?q=${encodeURIComponent(query)}`)
}

export async function createCharacter(name: string): Promise<string> {
  return ipcOnly('create_character', { name })
}

export async function updateCharacterIdentity(
  characterId: string,
  identity: Record<string, unknown>
): Promise<void> {
  return ipcOnly('update_character_identity', { characterId, identity })
}

export async function selectRace(characterId: string, raceId: string): Promise<void> {
  return ipcOnly('select_race', { characterId, raceId })
}

export async function selectClass(characterId: string, classId: string, level: number, slot?: string): Promise<void> {
  return ipcOnly('select_class', { characterId, classId, level, slot })
}

export async function assignAbilityScores(
  characterId: string,
  scores: Record<string, number>
): Promise<void> {
  return ipcOnly('assign_ability_scores', { characterId, scores })
}

export async function allocateSkillPoints(
  characterId: string,
  allocations: Record<string, number>
): Promise<void> {
  return ipcOnly('allocate_skill_points', { characterId, allocations })
}

export async function getWorkflowStatus(
  characterId: string,
  workflowId: string
): Promise<WorkflowStatus> {
  return ipcOnly('get_workflow_status', { characterId, workflowId })
}

export async function getAvailableChoices(
  characterId: string,
  slotType: string
): Promise<Entity[]> {
  return ipc('get_available_choices', { characterId, slotType }, `/_entities/by-type-full/${encodeURIComponent(slotType)}`)
}

export async function getSpeculativeState(characterId: string, queueId?: string): Promise<Entity | null> {
  return ipcOnly('get_speculative_state', { characterId, queueId })
}

export async function selectFeat(characterId: string, featId: string): Promise<void> {
  return ipcOnly('select_feat', { characterId, featId })
}

export async function getAvailableFeats(characterId: string): Promise<Entity[]> {
  return ipcOnly('get_available_feats', { characterId })
}

export interface DMSettings {
  ability_method: string
  max_ability_score: number
  gestalt_required: boolean
  no_templates: boolean
  max_ecl: number
  no_racial_hd: boolean
  enforce_prerequisites: boolean
  notes: string
  restricted_entities: string[]
  rule_cool: boolean
}

export async function getDmSettings(): Promise<DMSettings> {
  return ipcOnly('get_dm_settings')
}

export async function setDmSettings(settings: DMSettings): Promise<void> {
  return ipcOnly('set_dm_settings', { settings })
}

export async function exportCharacterJson(characterId: string): Promise<string> {
  return ipcOnly('export_character_json', { characterId })
}

export async function exportCharacterMarkdown(characterId: string): Promise<string> {
  return ipcOnly('export_character_markdown', { characterId })
}

export interface WorkflowStatus {
  completed: string[]
  pending: string[]
  available: string[]
}
