import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = vi.hoisted(() => ({ row: null, error: null, uid: 'user-dm', authFails: false }))

vi.mock('../lib/supabase', () => {
  function from() {
    const b = {
      select() { return b },
      eq() { return b },
      maybeSingle() { return b },
      then(resolve) { return resolve({ data: store.row, error: store.error }) },
    }
    return b
  }
  return {
    supabase: {
      from,
      auth: {
        getUser: async () => (store.authFails
          ? { data: { user: null } }
          : { data: { user: { id: store.uid } } }),
      },
    },
  }
})

const { isCampaignDM } = await import('../lib/campaigns')

beforeEach(() => {
  store.row = null
  store.error = null
  store.uid = 'user-dm'
  store.authFails = false
})

describe('isCampaignDM', () => {
  it('true quando o usuário corrente é o dm_id da mesa', async () => {
    store.row = { dm_id: 'user-dm' }
    expect(await isCampaignDM('camp-1')).toBe(true)
  })

  it('false pra membro que não é o Mestre', async () => {
    store.row = { dm_id: 'outro' }
    expect(await isCampaignDM('camp-1')).toBe(false)
  })

  it('false quando a RLS esconde a mesa (não-membro recebe null)', async () => {
    store.row = null
    expect(await isCampaignDM('camp-1')).toBe(false)
  })

  it('false em erro de leitura — nega por padrão, não abre a porta', async () => {
    store.error = { message: 'boom' }
    store.row = { dm_id: 'user-dm' }
    expect(await isCampaignDM('camp-1')).toBe(false)
  })

  it('false sem sessão', async () => {
    store.authFails = true
    store.row = { dm_id: 'user-dm' }
    expect(await isCampaignDM('camp-1')).toBe(false)
  })
})
