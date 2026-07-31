import { describe, it, expect, vi } from 'vitest'

const store = vi.hoisted(() => ({ rows: [], selected: null }))

vi.mock('../lib/supabase', () => {
  function from() {
    const b = {
      select(cols) { store.selected = cols; return b },
      eq() { return b },
      order() { return b },
      then(resolve) { return resolve({ data: store.rows, error: null }) },
    }
    return b
  }
  return { supabase: { from, auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } } }
})

const { loadCampaignCharacters } = await import('../lib/campaigns')
const { rowToCharacter } = await import('../utils/storage')

describe('companhia da mesa para o Mestre', () => {
  it('rowToCharacter é exportado e devolve doc + version', () => {
    const doc = rowToCharacter({
      id: 'x', owner_id: 'u2', campaign_id: 'camp-1', short_id: 'ABCDEFGHJK',
      version: 4, data: { id: 'x', info: { name: 'Thalior' }, combat: { currentHp: 9 } },
    })
    expect(doc).toMatchObject({
      id: 'x', ownerId: 'u2', campaignId: 'camp-1', version: 4,
      info: { name: 'Thalior' }, combat: { currentHp: 9 },
    })
  })

  // A version tem que chegar na companhia (o combate faz lock otimista com
  // ela), mas o select NÃO pode nomear colunas: um banco sem `version` fazia
  // o PostgREST recusar a query inteira (42703) e a mesa parecia vazia.
  // Ver campaign-characters-schema-drift.test.js.
  it('loadCampaignCharacters traz a version sem nomear colunas na query', async () => {
    store.rows = [{ id: 'x', owner_id: 'u2', campaign_id: 'camp-1', version: 4, data: { id: 'x' } }]
    const rows = await loadCampaignCharacters('camp-1')
    expect(rows).toHaveLength(1)
    expect(rows[0].version).toBe(4)
    expect(store.selected).toBe('*')
  })
})
