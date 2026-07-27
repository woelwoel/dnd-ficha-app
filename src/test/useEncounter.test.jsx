import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const api = vi.hoisted(() => ({
  active: null, created: null, saveResult: { ok: true, version: 2 },
  createResult: null, saveCalls: [], onRow: null,
}))

vi.mock('../lib/encounters', () => ({
  getActiveEncounter: vi.fn(async () => api.active),
  createEncounter: vi.fn(async (campaignId, state) => {
    if (api.createResult) return api.createResult
    api.created = { id: 'enc-1', campaign_id: campaignId, state, version: 1, active: true }
    api.active = api.created
    return { ok: true, row: api.created }
  }),
  saveEncounterState: vi.fn(async (id, state, v) => {
    api.saveCalls.push({ id, state, v })
    return api.saveResult
  }),
  closeEncounter: vi.fn(async () => ({ ok: true })),
  subscribeEncounter: vi.fn((id, onRow) => { api.onRow = onRow; return () => { api.onRow = null } }),
}))

const { useEncounter } = await import('../systems/dnd5e/components/Encounter/useEncounter')

beforeEach(() => {
  api.active = null; api.created = null; api.createResult = null
  api.saveResult = { ok: true, version: 2 }; api.saveCalls = []; api.onRow = null
})

describe('useEncounter', () => {
  it('cria um encontro vazio quando a mesa não tem nenhum ativo', async () => {
    const { result } = renderHook(() => useEncounter('camp-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.state).toMatchObject({ round: 0, started: false, combatants: [] })
    expect(api.created).not.toBeNull()
  })

  it('retoma o encontro existente sem criar outro', async () => {
    api.active = { id: 'enc-9', state: { round: 3, started: true, combatants: [], nextSeq: 1, activeId: null }, version: 5 }
    const { result } = renderHook(() => useEncounter('camp-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.state.round).toBe(3)
    expect(api.created).toBeNull()
  })

  it('update manda o state novo com a versão conhecida e guarda a nova', async () => {
    const { result } = renderHook(() => useEncounter('camp-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.update(s => ({ ...s, round: 7 })) })
    expect(api.saveCalls[0]).toMatchObject({ id: 'enc-1', v: 1 })
    expect(api.saveCalls[0].state.round).toBe(7)
    expect(result.current.state.round).toBe(7)

    api.saveResult = { ok: true, version: 3 }
    await act(async () => { await result.current.update(s => ({ ...s, round: 8 })) })
    expect(api.saveCalls[1].v).toBe(2)
  })

  it('conflito recarrega do servidor e sinaliza', async () => {
    const { result } = renderHook(() => useEncounter('camp-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    api.saveResult = { ok: false, reason: 'conflict' }
    api.active = { id: 'enc-1', state: { round: 42, started: false, combatants: [], nextSeq: 1, activeId: null }, version: 9 }
    await act(async () => { await result.current.update(s => ({ ...s, round: 7 })) })
    expect(result.current.conflict).toBe(true)
    expect(result.current.state.round).toBe(42)
  })

  it('realtime de outra tela do Mestre atualiza o state local', async () => {
    const { result } = renderHook(() => useEncounter('camp-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { api.onRow({ id: 'enc-1', state: { round: 5, started: true, combatants: [], nextSeq: 1, activeId: null }, version: 4 }) })
    expect(result.current.state.round).toBe(5)
  })

  it('realtime atrasado (versão menor) não regride o state; versão maior aplica', async () => {
    api.active = { id: 'enc-1', state: { round: 10, started: true, combatants: [], nextSeq: 1, activeId: null }, version: 5 }
    const { result } = renderHook(() => useEncounter('camp-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { api.onRow({ id: 'enc-1', state: { round: 999, started: true, combatants: [], nextSeq: 1, activeId: null }, version: 4 }) })
    expect(result.current.state.round).toBe(10)

    act(() => { api.onRow({ id: 'enc-1', state: { round: 20, started: true, combatants: [], nextSeq: 1, activeId: null }, version: 6 }) })
    expect(result.current.state.round).toBe(20)
  })

  it('duas chamadas de update em sequência (sem esperar a primeira) compõem no cliente', async () => {
    const { result } = renderHook(() => useEncounter('camp-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.state.round).toBe(0)

    await act(async () => {
      const p1 = result.current.update(s => ({ ...s, round: s.round + 1 }))
      const p2 = result.current.update(s => ({ ...s, round: s.round + 10 }))
      await Promise.all([p1, p2])
    })
    // A segunda parte do resultado da primeira (0+1=1, depois +10=11) — não
    // descarta o que a primeira chamada já tinha composto.
    expect(result.current.state.round).toBe(11)
  })

  it('criar falhando porque JÁ existe um ativo relê em vez de desistir', async () => {
    // getActiveEncounter devolve null tanto pra "não existe" quanto pra falha
    // de leitura. Se a criação bater no índice único da 0015, o encontro real
    // existe — o hook tem que reler e adotar em vez de mostrar erro.
    api.createResult = { ok: false, reason: 'unknown', message: 'duplicate key value violates unique constraint' }
    const existing = { id: 'enc-7', state: { round: 2, started: true, combatants: [], nextSeq: 1, activeId: null }, version: 3 }
    let call = 0
    const mod = await import('../lib/encounters')
    mod.getActiveEncounter.mockImplementation(async () => (call++ === 0 ? null : existing))

    const { result } = renderHook(() => useEncounter('camp-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.state.round).toBe(2)
    expect(result.current.encounterId).toBe('enc-7')
  })
})
