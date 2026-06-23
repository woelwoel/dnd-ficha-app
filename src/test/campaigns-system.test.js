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
})
