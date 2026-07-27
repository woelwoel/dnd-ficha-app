import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = vi.hoisted(() => ({ rows: [], insertErr: null, updateErr: null }))

vi.mock('../lib/supabase', () => {
  function from() {
    const ctx = { filter: () => true, single: false, patch: null }
    const b = {
      select() { return b },
      eq(col, val) { const p = ctx.filter; ctx.filter = r => p(r) && r[col] === val; return b },
      maybeSingle() { ctx.single = true; return b },
      single() { ctx.single = true; return b },
      insert(payload) {
        ctx.inserted = { id: `enc-${store.rows.length + 1}`, version: 1, active: true, ...payload }
        return b
      },
      update(patch) { ctx.patch = patch; return b },
      then(resolve) {
        if (store.insertErr && ctx.inserted) return resolve({ data: null, error: store.insertErr })
        if (ctx.inserted) { store.rows.push(ctx.inserted); return resolve({ data: ctx.inserted, error: null }) }
        if (ctx.patch) {
          if (store.updateErr) return resolve({ data: null, error: store.updateErr })
          const hit = store.rows.filter(ctx.filter)
          for (const r of hit) { Object.assign(r, ctx.patch); r.version += 1 }
          const out = hit.map(r => ({ version: r.version }))
          return resolve({ data: ctx.single ? (out[0] ?? null) : out, error: null })
        }
        const rows = store.rows.filter(ctx.filter)
        return resolve({ data: ctx.single ? (rows[0] ?? null) : rows, error: null })
      },
    }
    return b
  }
  const channel = { on() { return channel }, subscribe() { return channel } }
  return { supabase: { from, channel: () => channel, removeChannel: vi.fn() } }
})

const {
  getActiveEncounter, createEncounter, saveEncounterState, closeEncounter,
} = await import('../lib/encounters')

beforeEach(() => { store.rows = []; store.insertErr = null; store.updateErr = null })

describe('lib/encounters', () => {
  it('sem encontro ativo devolve null', async () => {
    expect(await getActiveEncounter('camp-1')).toBeNull()
  })

  it('cria e depois encontra o ativo da mesa', async () => {
    const res = await createEncounter('camp-1', { round: 0, combatants: [] })
    expect(res.ok).toBe(true)
    expect(res.row).toMatchObject({ campaign_id: 'camp-1', version: 1 })
    const found = await getActiveEncounter('camp-1')
    expect(found?.id).toBe(res.row.id)
  })

  it('salva state com a versão esperada e devolve a nova', async () => {
    const { row } = await createEncounter('camp-1', { round: 0 })
    const res = await saveEncounterState(row.id, { round: 1 }, row.version)
    expect(res).toEqual({ ok: true, version: 2 })
  })

  it('versão divergente = conflito, sem escrever', async () => {
    const { row } = await createEncounter('camp-1', { round: 0 })
    const res = await saveEncounterState(row.id, { round: 9 }, 42)
    expect(res).toEqual({ ok: false, reason: 'conflict' })
    expect(store.rows[0].state).toEqual({ round: 0 })
  })

  it('erro de rede vira reason unknown', async () => {
    const { row } = await createEncounter('camp-1', { round: 0 })
    store.updateErr = { message: 'boom' }
    expect(await saveEncounterState(row.id, {}, row.version)).toEqual({ ok: false, reason: 'unknown' })
  })

  it('encerrar marca active=false', async () => {
    const { row } = await createEncounter('camp-1', { round: 0 })
    expect(await closeEncounter(row.id)).toEqual({ ok: true })
    expect(store.rows[0].active).toBe(false)
  })
})
