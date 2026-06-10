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

  it('NÃO salva no carregamento inicial (skip-first)', async () => {
    const character = { id: 'c1', info: {} }
    renderHook(() => useAutoSave(character, { enabled: true, delayMs: 50 }))
    await vi.advanceTimersByTimeAsync(200)
    // Abrir a ficha não deve reescrever o que acabou de ser carregado.
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('salva após uma EDIÇÃO (mudança de character)', async () => {
    const character = { id: 'c1', info: { name: 'A' } }
    const { rerender } = renderHook(
      ({ ch }) => useAutoSave(ch, { enabled: true, delayMs: 50 }),
      { initialProps: { ch: character } },
    )
    await vi.advanceTimersByTimeAsync(60) // load: não salva
    expect(upsertMock).not.toHaveBeenCalled()

    const edited = { id: 'c1', info: { name: 'B' } }
    rerender({ ch: edited })
    await vi.advanceTimersByTimeAsync(60)
    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(upsertMock).toHaveBeenCalledWith(edited)
  })

  it('não dispara quando character.id é null', async () => {
    renderHook(() => useAutoSave({ info: {} }, { enabled: true, delayMs: 50 }))
    await vi.advanceTimersByTimeAsync(100)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('expõe error quando upsert falha (após edição)', async () => {
    upsertMock.mockResolvedValue({ ok: false, reason: 'limit' })
    const character = { id: 'c1', info: { name: 'A' } }
    const { result, rerender } = renderHook(
      ({ ch }) => useAutoSave(ch, { enabled: true, delayMs: 10 }),
      { initialProps: { ch: character } },
    )
    await act(async () => { await vi.advanceTimersByTimeAsync(20) })
    rerender({ ch: { id: 'c1', info: { name: 'B' } } })
    await act(async () => { await vi.advanceTimersByTimeAsync(20) })
    expect(result.current.error).toBe('limit')
  })

  it('faz FLUSH de edição pendente no unmount', async () => {
    const character = { id: 'c1', info: { name: 'A' } }
    const { rerender, unmount } = renderHook(
      ({ ch }) => useAutoSave(ch, { enabled: true, delayMs: 500 }),
      { initialProps: { ch: character } },
    )
    await vi.advanceTimersByTimeAsync(10) // consome o skip-first
    const edited = { id: 'c1', info: { name: 'B' } }
    rerender({ ch: edited })
    // Desmonta ANTES do debounce de 500ms disparar.
    unmount()
    expect(upsertMock).toHaveBeenCalledWith(edited)
  })

  it('re-tenta o save pendente quando a conexão volta (online)', async () => {
    upsertMock.mockResolvedValue({ ok: false, reason: 'unknown' })
    const character = { id: 'c1', info: { name: 'A' } }
    const { rerender } = renderHook(
      ({ ch }) => useAutoSave(ch, { enabled: true, delayMs: 10 }),
      { initialProps: { ch: character } },
    )
    await act(async () => { await vi.advanceTimersByTimeAsync(20) }) // skip-first
    const edited = { id: 'c1', info: { name: 'B' } }
    rerender({ ch: edited })
    await act(async () => { await vi.advanceTimersByTimeAsync(20) }) // falha
    expect(upsertMock).toHaveBeenCalledTimes(1)

    upsertMock.mockResolvedValue({ ok: true })
    await act(async () => { window.dispatchEvent(new Event('online')) })
    expect(upsertMock).toHaveBeenCalledTimes(2)
    expect(upsertMock).toHaveBeenLastCalledWith(edited)
  })
})
