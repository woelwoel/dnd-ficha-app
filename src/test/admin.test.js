import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = vi.hoisted(() => ({ characters: [], campaigns: [] }))

const supabaseMock = vi.hoisted(() => ({
  from(table) {
    const rows = table === 'characters' ? store.characters : store.campaigns
    return {
      select() { return this },
      order() { return Promise.resolve({ data: rows, error: null }) },
    }
  },
}))

vi.mock('../lib/supabase', () => ({ supabase: supabaseMock }))

import { adminListCharacters, adminListCampaigns } from '../lib/admin'

describe('lib/admin', () => {
  beforeEach(() => { store.characters = []; store.campaigns = [] })

  it('adminListCharacters mapeia dono, nome e nível', async () => {
    store.characters = [{
      id: 'a', owner_id: 'u1', campaign_id: null, short_id: 'SHORT12345',
      updated_at: '2026-06-18T00:00:00Z',
      data: { info: { name: 'Allyson', class: 'ladino', level: 5 } },
      profiles: { display_name: 'Gabriel' },
    }]
    const out = await adminListCharacters()
    expect(out[0]).toMatchObject({
      id: 'a', ownerName: 'Gabriel', name: 'Allyson', className: 'ladino', level: 5, shortId: 'SHORT12345',
    })
  })

  it('adminListCampaigns mapeia DM e contagem de membros', async () => {
    store.campaigns = [{
      id: 'c1', name: 'Mesa do Allyson', dm_id: 'u1', created_at: '2026-06-18T00:00:00Z',
      profiles: { display_name: 'Gabriel' },
      campaign_members: [{ count: 3 }],
    }]
    const out = await adminListCampaigns()
    expect(out[0]).toMatchObject({ id: 'c1', name: 'Mesa do Allyson', dmName: 'Gabriel', memberCount: 3 })
  })

  it('em erro retorna []', async () => {
    const orig = supabaseMock.from
    supabaseMock.from = () => ({ select() { return this }, order() { return Promise.resolve({ data: null, error: { message: 'x' } }) } })
    expect(await adminListCharacters()).toEqual([])
    supabaseMock.from = orig
  })
})
