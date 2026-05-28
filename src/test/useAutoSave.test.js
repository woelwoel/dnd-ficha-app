import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

const upsertMock = vi.fn()
vi.mock('../utils/storage', () => ({
  upsertCharacter: (...args) => upsertMock(...args),
}))
vi.mock('../lib/report', () => ({ reportError: vi.fn() }))

import { useAutoSave } from '../hooks/useAutoSave'

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    upsertMock.mockReset()
    upsertMock.mockResolvedValue({ ok: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('não dispara quando enabled=false (modo readOnly)', async () => {
    const character = { id: '1', info: {} }
    renderHook(() => useAutoSave(character, { enabled: false, delayMs: 50 }))
    await vi.advanceTimersByTimeAsync(200)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('dispara save após debounce quando enabled=true', async () => {
    const character = { id: 'c1', info: {} }
    renderHook(() => useAutoSave(character, { enabled: true, delayMs: 50 }))
    await vi.advanceTimersByTimeAsync(60)
    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(upsertMock).toHaveBeenCalledWith(character)
  })

  it('não dispara quando character.id é null', async () => {
    renderHook(() => useAutoSave({ info: {} }, { enabled: true, delayMs: 50 }))
    await vi.advanceTimersByTimeAsync(100)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('expõe error quando upsert falha', async () => {
    upsertMock.mockResolvedValue({ ok: false, reason: 'limit' })
    const character = { id: 'c1', info: {} }
    const { result } = renderHook(() => useAutoSave(character, { enabled: true, delayMs: 10 }))
    await act(async () => { await vi.advanceTimersByTimeAsync(50) })
    expect(result.current.error).toBe('limit')
  })
})
