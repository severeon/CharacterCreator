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
