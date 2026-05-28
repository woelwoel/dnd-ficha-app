import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = vi.hoisted(() => ({
  uid: 'user-1',
  campaigns: [],     // {id, name, dm_id, invite_code}
  members: [],       // {campaign_id, user_id, role}
  characters: [],    // {id, owner_id, campaign_id, data, last_opened_at, short_id}
  rpcErr: null,      // injeta erro nos rpcs pra testar
}))

const supabaseMock = vi.hoisted(() => {
  const tableMap = { campaign_members: 'members', campaigns: 'campaigns', characters: 'characters' }
  function from(table) {
    const ctx = { filter: () => true, single: false }
    const key = tableMap[table] ?? table
    const data = () => store[key]
    const b = {
      select() { return b },
      order() { return b },
      eq(col, val) { const p = ctx.filter; ctx.filter = (r) => p(r) && r[col] === val; return b },
      is(col, val) { const p = ctx.filter; ctx.filter = (r) => p(r) && r[col] === val; return b },
      maybeSingle() { ctx.single = true; return b },
      single() { ctx.single = true; return b },
      then(resolve) {
        const rows = data().filter(ctx.filter)
        if (ctx.single) return resolve({ data: rows[0] ?? null, error: null })
        return resolve({ data: rows, error: null })
      },
      delete() {
        const dctx = { filter: ctx.filter }
        const db = {
          eq(c, v) { const p = dctx.filter; dctx.filter = (r) => p(r) && r[c] === v; return db },
          then(resolve) {
            const arr = data()
            for (let i = arr.length - 1; i >= 0; i--) if (dctx.filter(arr[i])) arr.splice(i, 1)
            return resolve({ data: null, error: null })
          },
        }
        return db
      },
    }
    return b
  }
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: store.uid } } })) },
    from,
    rpc: vi.fn(async (name, args) => {
      if (store.rpcErr) return { data: null, error: { message: store.rpcErr } }
      if (name === 'create_campaign') {
        const id = `camp-${store.campaigns.length + 1}`
        const code = 'ABCDEFGHJK'
        store.campaigns.push({ id, name: args.p_name, dm_id: store.uid, invite_code: code })
        store.members.push({ campaign_id: id, user_id: store.uid, role: 'dm' })
        return { data: id, error: null }
      }
      if (name === 'join_campaign') {
        const c = store.campaigns.find(x => x.invite_code === args.p_code)
        if (!c) return { data: null, error: { message: 'not_found_or_already_member' } }
        if (store.members.some(m => m.campaign_id === c.id && m.user_id === store.uid)) {
          return { data: null, error: { message: 'not_found_or_already_member' } }
        }
        store.members.push({ campaign_id: c.id, user_id: store.uid, role: 'player' })
        return { data: c.id, error: null }
      }
      if (name === 'rotate_invite_code') {
        const c = store.campaigns.find(x => x.id === args.p_campaign_id)
        if (!c) return { data: null, error: { message: 'not_found' } }
        c.invite_code = 'ZZZZZZZZZZ'
        return { data: c.invite_code, error: null }
      }
      if (name === 'delete_my_account') {
        store.campaigns = store.campaigns.filter(c => c.dm_id !== store.uid)
        store.members  = store.members.filter(m => m.user_id !== store.uid)
        return { data: null, error: null }
      }
      return { data: null, error: { message: 'unknown rpc: ' + name } }
    }),
  }
})

vi.mock('../lib/supabase', () => ({ supabase: supabaseMock }))

import {
  listMyCampaigns, createCampaign, joinCampaign,
  rotateInviteCode, leaveCampaign, removeMember,
  listMembers, loadCampaignCharacters, deleteMyAccount,
} from '../lib/campaigns'

describe('campaigns (lib)', () => {
  beforeEach(() => {
    store.uid = 'user-1'
    store.campaigns = []
    store.members = []
    store.characters = []
    store.rpcErr = null
  })

  it('createCampaign retorna ok+id e me insere como dm', async () => {
    const r = await createCampaign('Mesa do Frodo')
    expect(r.ok).toBe(true)
    expect(typeof r.id).toBe('string')
    expect(store.members).toEqual([{ campaign_id: r.id, user_id: 'user-1', role: 'dm' }])
  })

  it('listMyCampaigns devolve mesas com role do usuário', async () => {
    const { id } = await createCampaign('M1')
    const list = await listMyCampaigns()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id, name: 'M1', role: 'dm' })
  })

  it('joinCampaign com código bom retorna ok+id; código ruim retorna reason', async () => {
    const { id } = await createCampaign('M1')
    const code = store.campaigns[0].invite_code
    store.uid = 'user-2'
    expect(await joinCampaign(code)).toEqual({ ok: true, id })
    expect(await joinCampaign('NOPE')).toEqual({ ok: false, reason: 'not-found-or-already-member' })
  })

  it('rotateInviteCode devolve novo código', async () => {
    const { id } = await createCampaign('M1')
    const oldCode = store.campaigns[0].invite_code
    const r = await rotateInviteCode(id)
    expect(r.ok).toBe(true)
    expect(r.code).not.toBe(oldCode)
  })

  it('deleteMyAccount apaga campanhas onde sou DM', async () => {
    await createCampaign('M1')
    const r = await deleteMyAccount()
    expect(r.ok).toBe(true)
    expect(store.campaigns).toEqual([])
  })

  it('listMembers devolve membros da mesa', async () => {
    const { id } = await createCampaign('M1')
    store.members.push({ campaign_id: id, user_id: 'user-2', role: 'player' })
    const list = await listMembers(id)
    expect(list).toHaveLength(2)
  })

  it('leaveCampaign remove a si próprio', async () => {
    const { id } = await createCampaign('M1')
    store.uid = 'user-2'
    await joinCampaign(store.campaigns[0].invite_code)
    const r = await leaveCampaign(id)
    expect(r.ok).toBe(true)
    expect(store.members.some(m => m.user_id === 'user-2')).toBe(false)
  })
})
