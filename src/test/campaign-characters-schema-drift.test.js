import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Reprodução do bug de produção (2026-07-31): o banco não tinha a coluna
 * `characters.version` (migration 0009 nunca aplicada), o select nomeava a
 * coluna, o PostgREST respondia HTTP 400 / 42703 e a tela do Mestre exibia
 * "Nenhum jogador criou ficha vinculada à mesa ainda" — mentindo.
 *
 * Este mock imita o servidor real: um select que NOMEIE uma coluna ausente
 * devolve 42703; `*` nunca é rejeitado por coluna.
 */
const store = vi.hoisted(() => ({
  rows: [],
  selected: null,
  colunasAusentes: [],   // colunas que este "banco" não tem
  forceError: null,      // erro cru injetado (rede, RLS, etc.)
}))

vi.mock('../lib/supabase', () => {
  function from() {
    const b = {
      select(cols) { store.selected = cols; return b },
      eq() { return b },
      order() { return b },
      then(resolve) {
        if (store.forceError) return resolve({ data: null, error: store.forceError })
        const nomeadas = store.selected ?? ''
        const faltando = nomeadas === '*'
          ? null
          : store.colunasAusentes.find(c => new RegExp(`\\b${c}\\b`).test(nomeadas))
        if (faltando) {
          return resolve({
            data: null,
            error: { code: '42703', message: `column characters.${faltando} does not exist` },
          })
        }
        return resolve({ data: store.rows, error: null })
      },
    }
    return b
  }
  return { supabase: { from, auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } } }
})

const { loadCampaignCharacters, fetchCampaignCharacters } = await import('../lib/campaigns')

const FICHA = { id: 'x', owner_id: 'u2', campaign_id: 'camp-1', version: 4, data: { id: 'x' } }

describe('leitura da companhia da mesa', () => {
  beforeEach(() => {
    store.rows = [FICHA]
    store.selected = null
    store.colunasAusentes = []
    store.forceError = null
  })

  it('devolve as fichas mesmo num banco sem a coluna version (migration 0009 pendente)', async () => {
    store.colunasAusentes = ['version']
    const rows = await loadCampaignCharacters('camp-1')
    expect(rows).toHaveLength(1)
  })

  it('continua trazendo a version quando a coluna existe (lock otimista do combate)', async () => {
    const rows = await loadCampaignCharacters('camp-1')
    expect(rows[0].version).toBe(4)
  })

  it('fetchCampaignCharacters devolve ok:true com as linhas no caminho feliz', async () => {
    const res = await fetchCampaignCharacters('camp-1')
    expect(res.ok).toBe(true)
    expect(res.rows).toHaveLength(1)
  })

  it('fetchCampaignCharacters informa o erro em vez de fingir mesa vazia', async () => {
    store.forceError = { code: 'PGRST301', message: 'JWT expired' }
    const res = await fetchCampaignCharacters('camp-1')
    expect(res.ok).toBe(false)
    expect(res.rows).toEqual([])
    expect(res.message).toMatch(/JWT expired/)
  })

  it('loadCampaignCharacters mantém o contrato legado (array vazio em erro, nunca lança)', async () => {
    store.forceError = { code: 'PGRST301', message: 'JWT expired' }
    await expect(loadCampaignCharacters('camp-1')).resolves.toEqual([])
  })
})
