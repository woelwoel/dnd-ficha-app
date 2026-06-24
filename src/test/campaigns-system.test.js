import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }))
import { supabase } from '../lib/supabase'
import { createCampaign, getCampaignSystem } from '../lib/campaigns'

beforeEach(() => vi.clearAllMocks())

describe('mesa ↔ sistema', () => {
  it('createCampaign passa p_system', async () => {
    supabase.rpc.mockResolvedValue({ data: 'cid', error: null })
    await createCampaign('Mesa X', 'dnd5e')
    expect(supabase.rpc).toHaveBeenCalledWith('create_campaign', { p_name: 'Mesa X', p_system: 'dnd5e' })
  })

  it('getCampaignSystem lê a coluna system', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { system: 'dnd5e' }, error: null })
    supabase.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle }) }) })
    expect(await getCampaignSystem('cid')).toBe('dnd5e')
  })

  it('createCampaign degrada pro signature antigo quando p_system não existe (PGRST202)', async () => {
    supabase.rpc
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'function not found' } })
      .mockResolvedValueOnce({ data: 'cid', error: null })
    const r = await createCampaign('Mesa X', 'dnd5e')
    expect(r).toEqual({ ok: true, id: 'cid' })
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'create_campaign', { p_name: 'Mesa X', p_system: 'dnd5e' })
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'create_campaign', { p_name: 'Mesa X' })
  })
})
