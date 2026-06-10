import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

const saveMock = vi.fn()
vi.mock('../utils/storage', () => ({
  saveCharacterVersioned: (...args) => saveMock(...args),
}))
vi.mock('../lib/report', () => ({ reportError: vi.fn() }))

import { useAutoSave } from '../hooks/useAutoSave'

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    saveMock.mockReset()
    saveMock.mockResolvedValue({ ok: true, version: 2 })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('não dispara quando enabled=false (modo readOnly)', async () => {
    const character = { id: '1', info: {} }
    renderHook(() => useAutoSave(character, { enabled: false, delayMs: 50 }))
    await vi.advanceTimersByTimeAsync(200)
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('NÃO salva no carregamento inicial (skip-first)', async () => {
    const character = { id: 'c1', info: {} }
    renderHook(() => useAutoSave(character, { enabled: true, delayMs: 50 }))
    await vi.advanceTimersByTimeAsync(200)
    // Abrir a ficha não deve reescrever o que acabou de ser carregado.
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('salva após uma EDIÇÃO (mudança de character)', async () => {
    const character = { id: 'c1', info: { name: 'A' } }
    const { rerender } = renderHook(
      ({ ch }) => useAutoSave(ch, { enabled: true, delayMs: 50 }),
      { initialProps: { ch: character } },
    )
    await vi.advanceTimersByTimeAsync(60) // load: não salva
    expect(saveMock).not.toHaveBeenCalled()

    const edited = { id: 'c1', info: { name: 'B' } }
    rerender({ ch: edited })
    await vi.advanceTimersByTimeAsync(60)
    expect(saveMock).toHaveBeenCalledTimes(1)
    expect(saveMock).toHaveBeenCalledWith(edited)
  })

  it('não dispara quando character.id é null', async () => {
    renderHook(() => useAutoSave({ info: {} }, { enabled: true, delayMs: 50 }))
    await vi.advanceTimersByTimeAsync(100)
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('expõe error quando o save falha (após edição)', async () => {
    saveMock.mockResolvedValue({ ok: false, reason: 'limit' })
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
    expect(saveMock).toHaveBeenCalledWith(edited)
  })

  it('re-tenta o save pendente quando a conexão volta (online)', async () => {
    saveMock.mockResolvedValue({ ok: false, reason: 'unknown' })
    const character = { id: 'c1', info: { name: 'A' } }
    const { rerender } = renderHook(
      ({ ch }) => useAutoSave(ch, { enabled: true, delayMs: 10 }),
      { initialProps: { ch: character } },
    )
    await act(async () => { await vi.advanceTimersByTimeAsync(20) }) // skip-first
    const edited = { id: 'c1', info: { name: 'B' } }
    rerender({ ch: edited })
    await act(async () => { await vi.advanceTimersByTimeAsync(20) }) // falha
    expect(saveMock).toHaveBeenCalledTimes(1)

    saveMock.mockResolvedValue({ ok: true, version: 3 })
    await act(async () => { window.dispatchEvent(new Event('online')) })
    expect(saveMock).toHaveBeenCalledTimes(2)
    expect(saveMock).toHaveBeenLastCalledWith(edited)
  })

  it('conflito de versão: expõe error=conflict, chama onConflict e NÃO re-tenta no online', async () => {
    saveMock.mockResolvedValue({ ok: false, reason: 'conflict' })
    const onConflict = vi.fn()
    const character = { id: 'c1', version: 1, info: { name: 'A' } }
    const { result, rerender } = renderHook(
      ({ ch }) => useAutoSave(ch, { enabled: true, delayMs: 10, onConflict }),
      { initialProps: { ch: character } },
    )
    await act(async () => { await vi.advanceTimersByTimeAsync(20) }) // skip-first
    rerender({ ch: { id: 'c1', version: 1, info: { name: 'B' } } })
    await act(async () => { await vi.advanceTimersByTimeAsync(20) })
    expect(result.current.error).toBe('conflict')
    expect(onConflict).toHaveBeenCalledTimes(1)

    // Retry no reconnect não resolve conflito — não deve disparar.
    await act(async () => { window.dispatchEvent(new Event('online')) })
    expect(saveMock).toHaveBeenCalledTimes(1)
  })

  it('threading de versão: usa a versão confirmada pelo servidor (max com a do state)', async () => {
    // O state do React fica com a versão velha (o hook não tem setCharacter);
    // a ref interna guarda a confirmada. O save seguinte deve usar a MAIOR.
    saveMock.mockResolvedValue({ ok: true, version: 7 })
    const character = { id: 'c1', version: 1, info: { name: 'A' } }
    const { rerender } = renderHook(
      ({ ch }) => useAutoSave(ch, { enabled: true, delayMs: 10 }),
      { initialProps: { ch: character } },
    )
    await act(async () => { await vi.advanceTimersByTimeAsync(20) }) // skip-first

    rerender({ ch: { id: 'c1', version: 1, info: { name: 'B' } } })
    await act(async () => { await vi.advanceTimersByTimeAsync(20) })
    expect(saveMock).toHaveBeenLastCalledWith(expect.objectContaining({ version: 1 }))

    // Servidor devolveu 7; state ainda diz 1 → próximo save vai com 7.
    rerender({ ch: { id: 'c1', version: 1, info: { name: 'C' } } })
    await act(async () => { await vi.advanceTimersByTimeAsync(20) })
    expect(saveMock).toHaveBeenLastCalledWith(expect.objectContaining({ version: 7 }))

    // Refetch pós-conflito traria versão MAIOR no state → max escolhe a do state.
    rerender({ ch: { id: 'c1', version: 12, info: { name: 'D' } } })
    await act(async () => { await vi.advanceTimersByTimeAsync(20) })
    expect(saveMock).toHaveBeenLastCalledWith(expect.objectContaining({ version: 12 }))
  })
})
