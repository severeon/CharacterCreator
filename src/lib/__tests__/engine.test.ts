import { describe, it, expect, vi, beforeAll } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'
import { getEntitiesByType, getEntityById, searchEntities } from '../engine'

describe('engine IPC wrapper', () => {
  beforeAll(() => {
    ;(globalThis as any).window = { __TAURI_INTERNALS__: {} }
  })

  it('getEntitiesByType calls correct command', async () => {
    vi.mocked(invoke).mockResolvedValue([])
    await getEntitiesByType('class')
    expect(invoke).toHaveBeenCalledWith('get_entities_by_type', { entityType: 'class' })
  })

  it('getEntityById calls correct command', async () => {
    vi.mocked(invoke).mockResolvedValue(null)
    await getEntityById('srd:class:fighter')
    expect(invoke).toHaveBeenCalledWith('get_entity_by_id', { id: 'srd:class:fighter' })
  })

  it('searchEntities calls correct command', async () => {
    vi.mocked(invoke).mockResolvedValue([])
    await searchEntities('fighter')
    expect(invoke).toHaveBeenCalledWith('search_entities', { query: 'fighter' })
  })
})
