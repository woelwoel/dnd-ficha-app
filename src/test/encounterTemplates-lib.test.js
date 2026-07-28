import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = vi.hoisted(() => ({ rows: [], nextError: null }))

vi.mock('../lib/supabase', () => {
  function from() {
    const ctx = { filter: () => true, single: false, op: null, payload: null }
    const b = {
      select() { return b },
      order() { return b },
      eq(col, val) { const p = ctx.filter; ctx.filter = r => p(r) && r[col] === val; return b },
      maybeSingle() { ctx.single = true; return b },
      single() { ctx.single = true; return b },
      insert(payload) { ctx.op = 'insert'; ctx.payload = payload; return b },
      update(payload) { ctx.op = 'update'; ctx.payload = payload; return b },
      delete() { ctx.op = 'delete'; return b },
      then(resolve) {
        if (store.nextError) return resolve({ data: null, error: store.nextError })
        if (ctx.op === 'insert') {
          const row = { id: `tpl-${store.rows.length + 1}`, ...ctx.payload }
          store.rows.push(row)
          return resolve({ data: ctx.single ? row : [row], error: null })
        }
        if (ctx.op === 'update') {
          const hit = store.rows.filter(ctx.filter)
          for (const r of hit) Object.assign(r, ctx.payload)
          return resolve({ data: ctx.single ? (hit[0] ?? null) : hit, error: null })
        }
        if (ctx.op === 'delete') {
          for (let i = store.rows.length - 1; i >= 0; i--) if (ctx.filter(store.rows[i])) store.rows.splice(i, 1)
          return resolve({ data: null, error: null })
        }
        const rows = store.rows.filter(ctx.filter)
        return resolve({ data: ctx.single ? (rows[0] ?? null) : rows, error: null })
      },
    }
    return b
  }
  return { supabase: { from } }
})

const {
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
} = await import('../lib/encounterTemplates')

beforeEach(() => { store.rows = []; store.nextError = null })

describe('lib/encounterTemplates', () => {
  it('lista vazia quando a mesa não tem nada', async () => {
    expect(await listTemplates('camp-1')).toEqual([])
  })

  it('cria e lista', async () => {
    const res = await createTemplate('camp-1', 'Emboscada', [{ monsterIndex: 'goblin', count: 3 }])
    expect(res.ok).toBe(true)
    expect(res.row).toMatchObject({ campaign_id: 'camp-1', name: 'Emboscada' })
    expect(await listTemplates('camp-1')).toHaveLength(1)
  })

  it('apara espaços do nome antes de salvar', async () => {
    const res = await createTemplate('camp-1', '  Emboscada  ', [])
    expect(res.row.name).toBe('Emboscada')
  })

  it('recusa nome vazio sem ir ao servidor', async () => {
    expect(await createTemplate('camp-1', '   ', [])).toEqual({ ok: false, reason: 'invalid-name' })
    expect(store.rows).toHaveLength(0)
  })

  it('recusa nome longo demais sem ir ao servidor', async () => {
    expect(await createTemplate('camp-1', 'x'.repeat(81), [])).toEqual({ ok: false, reason: 'invalid-name' })
    expect(store.rows).toHaveLength(0)
  })

  it('traduz nome duplicado do banco', async () => {
    store.nextError = { code: '23505', message: 'duplicate key value violates unique constraint' }
    expect(await createTemplate('camp-1', 'Emboscada', [])).toMatchObject({ ok: false, reason: 'duplicate-name' })
  })

  it('atualiza nome e monstros', async () => {
    const { row } = await createTemplate('camp-1', 'Antes', [])
    const res = await updateTemplate(row.id, { name: 'Depois', monsters: [{ monsterIndex: 'ogre', count: 1 }] })
    expect(res.ok).toBe(true)
    expect(store.rows[0]).toMatchObject({ name: 'Depois' })
  })

  it('update sem campo nenhum não vai ao servidor', async () => {
    const { row } = await createTemplate('camp-1', 'Intacto', [])
    store.nextError = { code: '23505', message: 'não deveria chegar aqui' }
    expect(await updateTemplate(row.id, {})).toEqual({ ok: true })
    expect(store.rows[0].name).toBe('Intacto')
  })

  it('apaga', async () => {
    const { row } = await createTemplate('camp-1', 'Some', [])
    expect(await deleteTemplate(row.id)).toEqual({ ok: true })
    expect(store.rows).toHaveLength(0)
  })
})
