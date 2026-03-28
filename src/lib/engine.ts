import { invoke } from '@tauri-apps/api/core'
import type { Entity, EntitySummary } from './types'

export async function getEntitiesByType(entityType: string): Promise<EntitySummary[]> {
  return invoke('get_entities_by_type', { entityType })
}

export async function getEntityById(id: string): Promise<Entity | null> {
  return invoke('get_entity_by_id', { id })
}

export async function searchEntities(query: string): Promise<EntitySummary[]> {
  return invoke('search_entities', { query })
}

export async function createCharacter(name: string): Promise<string> {
  return invoke('create_character', { name })
}

export async function updateCharacterIdentity(
  characterId: string,
  identity: Record<string, unknown>
): Promise<void> {
  return invoke('update_character_identity', { characterId, identity })
}

export async function selectRace(characterId: string, raceId: string): Promise<void> {
  return invoke('select_race', { characterId, raceId })
}

export async function selectClass(characterId: string, classId: string, level: number, slot?: string): Promise<void> {
  return invoke('select_class', { characterId, classId, level, slot })
}

export async function assignAbilityScores(
  characterId: string,
  scores: Record<string, number>
): Promise<void> {
  return invoke('assign_ability_scores', { characterId, scores })
}

export async function allocateSkillPoints(
  characterId: string,
  allocations: Record<string, number>
): Promise<void> {
  return invoke('allocate_skill_points', { characterId, allocations })
}

export async function getWorkflowStatus(
  characterId: string,
  workflowId: string
): Promise<WorkflowStatus> {
  return invoke('get_workflow_status', { characterId, workflowId })
}

export async function getAvailableChoices(
  characterId: string,
  slotType: string
): Promise<Entity[]> {
  return invoke('get_available_choices', { characterId, slotType })
}

export async function getSpeculativeState(characterId: string, queueId?: string): Promise<Entity | null> {
  return invoke('get_speculative_state', { characterId, queueId })
}

export async function selectFeat(characterId: string, featId: string): Promise<void> {
  return invoke('select_feat', { characterId, featId })
}

export async function getAvailableFeats(characterId: string): Promise<Entity[]> {
  return invoke('get_available_feats', { characterId })
}

export interface WorkflowStatus {
  completed: string[]
  pending: string[]
  available: string[]
}
