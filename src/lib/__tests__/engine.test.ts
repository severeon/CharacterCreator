import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInvoke = vi.fn()

vi.mock('../platform', () => ({
  isTauri: true,
  ipc: (...args: unknown[]) => mockInvoke(args[0], args[1]),
  ipcOnly: (...args: unknown[]) => mockInvoke(args[0], args[1]),
}))

import { getEntitiesByType, getEntityById, searchEntities } from '../engine'

describe('engine IPC wrapper', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('getEntitiesByType calls correct command', async () => {
    mockInvoke.mockResolvedValue([])
    await getEntitiesByType('class')
    expect(mockInvoke).toHaveBeenCalledWith('get_entities_by_type', { entityType: 'class' })
  })

  it('getEntityById calls correct command', async () => {
    mockInvoke.mockResolvedValue(null)
    await getEntityById('srd:class:fighter')
    expect(mockInvoke).toHaveBeenCalledWith('get_entity_by_id', { id: 'srd:class:fighter' })
  })

  it('searchEntities calls correct command', async () => {
    mockInvoke.mockResolvedValue([])
    await searchEntities('fighter')
    expect(mockInvoke).toHaveBeenCalledWith('search_entities', { query: 'fighter' })
  })
})
