import { describe, it, expect, vi } from 'vitest'

const calls = vi.hoisted(() => ({ update: null, eq: null }))
const supabaseMock = vi.hoisted(() => ({
  from() {
    return {
      update(patch) { calls.update = patch; return this },
      eq(col, val) { calls.eq = [col, val]; return Promise.resolve({ error: null }) },
    }
  },
}))
vi.mock('../lib/supabase', () => ({ supabase: supabaseMock }))

import { renameCampaign } from '../lib/campaigns'

describe('renameCampaign', () => {
  it('faz update do name (trim) na mesa certa', async () => {
    const r = await renameCampaign('c1', '  Nova Mesa  ')
    expect(r.ok).toBe(true)
    expect(calls.update).toEqual({ name: 'Nova Mesa' })
    expect(calls.eq).toEqual(['id', 'c1'])
  })

  it('rejeita nome vazio sem ir ao servidor', async () => {
    calls.update = null
    const r = await renameCampaign('c1', '   ')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('invalid-name')
    expect(calls.update).toBe(null)
  })
})
