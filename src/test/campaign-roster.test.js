import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({ rpcResult: { data: [], error: null } }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(async () => state.rpcResult),
  },
}))

import { loadCampaignRoster } from '../lib/campaigns'

beforeEach(() => {
  state.rpcResult = { data: [], error: null }
})

describe('loadCampaignRoster', () => {
  it('molda as linhas da RPC no formato de token (info/combat/position)', async () => {
    state.rpcResult = {
      data: [{
        id: 'c1',
        owner_id: 'u9',
        short_id: 'AbCdEfGhJk',
        campaign_id: 'camp1',
        name: 'Arjuna',
        class: 'druida',
        race: 'elfo',
        level: 13,
        max_hp: 90,
        current_hp: 72,
        armor_class: 16,
        position: { x: 0.2, y: 0.4 },
        last_opened_at: '2026-06-20T10:00:00.000Z',
      }],
      error: null,
    }
    const res = await loadCampaignRoster('camp1')
    expect(res.ok).toBe(true)
    expect(res.rows).toHaveLength(1)
    const r = res.rows[0]
    expect(r.id).toBe('c1')
    expect(r.ownerId).toBe('u9')
    expect(r.shortId).toBe('AbCdEfGhJk')
    expect(r.isSummary).toBe(true)
    expect(r.info).toEqual({ name: 'Arjuna', class: 'druida', race: 'elfo', level: 13 })
    expect(r.combat).toEqual({ maxHp: 90, currentHp: 72, armorClass: 16 })
    expect(r.position).toEqual({ x: 0.2, y: 0.4 })
    expect(r.lastOpenedAt).toBe(Date.parse('2026-06-20T10:00:00.000Z'))
  })

  it('NÃO expõe o data completo da ficha (só campos de resumo)', async () => {
    state.rpcResult = {
      data: [{ id: 'c1', owner_id: 'u9', short_id: null, campaign_id: 'camp1', name: 'X', class: 'mago', race: 'humano', level: 1 }],
      error: null,
    }
    const res = await loadCampaignRoster('camp1')
    const r = res.rows[0]
    // Sem chaves de payload sensível como spellcasting/inventory/attributes.
    expect(r).not.toHaveProperty('attributes')
    expect(r).not.toHaveProperty('spellcasting')
    expect(r).not.toHaveProperty('inventory')
  })

  it('RPC ausente/erro (migration 0011 não aplicada) → ok:false pra fallback', async () => {
    state.rpcResult = { data: null, error: { message: 'function public.campaign_roster does not exist' } }
    const res = await loadCampaignRoster('camp1')
    expect(res.ok).toBe(false)
    expect(res.rows).toEqual([])
  })
})
