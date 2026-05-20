import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock in-memory do supabase. Cada teste limpa via beforeEach.
const store = vi.hoisted(() => ({
  rows: [],
  uid: 'user-1',
}))

const supabaseMock = vi.hoisted(() => {
  // Builder pra chain .from('characters').select()... etc.
  function from(table) {
    if (table !== 'characters') {
      throw new Error('Mock supports only characters table: ' + table)
    }
    const ctx = { filter: () => true, single: false, columns: '*' }
    const builder = {
      select(cols = '*') { ctx.columns = cols; return builder },
      order() { return builder },
      eq(col, val) { const prev = ctx.filter; ctx.filter = (r) => prev(r) && r[col] === val; return builder },
      single() { ctx.single = true; return builder },
      maybeSingle() { ctx.single = true; ctx.maybe = true; return builder },
      // Terminators that return Promises:
      then(resolve) {
        const rows = store.rows.filter(ctx.filter)
        if (ctx.single) return resolve({ data: rows[0] ?? null, error: rows.length === 0 && !ctx.maybe ? { message: 'No rows' } : null })
        return resolve({ data: rows, error: null })
      },
      upsert(record) {
        // Aplica o upsert no store em memória e retorna um builder que pode
        // ser awaited diretamente OU encadeado com `.select(...).maybeSingle()`.
        const arr = Array.isArray(record) ? record : [record]
        const out = []
        for (const r of arr) {
          if (!r.id) {
            return Promise.resolve({ data: null, error: { message: 'id required' } })
          }
          // Auto-gera short_id no insert (simula trigger characters_set_short_id).
          const idx = store.rows.findIndex(x => x.id === r.id)
          const isInsert = idx < 0
          const stamped = {
            owner_id: store.uid,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            short_id: isInsert ? `mock${Math.random().toString(36).slice(2, 8)}` : store.rows[idx].short_id,
            ...r,
          }
          if (idx >= 0) store.rows[idx] = { ...store.rows[idx], ...stamped, updated_at: new Date().toISOString() }
          else store.rows.push(stamped)
          out.push(stamped)
        }
        const upsertCtx = { single: false, columns: '*' }
        const upsertBuilder = {
          select(cols = '*') { upsertCtx.columns = cols; return upsertBuilder },
          single() { upsertCtx.single = true; return upsertBuilder },
          maybeSingle() { upsertCtx.single = true; return upsertBuilder },
          then(resolve) {
            if (upsertCtx.single) return resolve({ data: out[0] ?? null, error: null })
            return resolve({ data: out, error: null })
          },
        }
        return upsertBuilder
      },
      insert(record) { return builder.upsert(record) },
      delete() {
        // Returns a builder so .eq() can be chained after .delete()
        const deleteCtx = { filter: ctx.filter }
        const deleteBuilder = {
          eq(col, val) { const prev = deleteCtx.filter; deleteCtx.filter = (r) => prev(r) && r[col] === val; return deleteBuilder },
          then(resolve) {
            const before = store.rows.length
            store.rows = store.rows.filter(r => !deleteCtx.filter(r))
            return resolve({ data: null, error: null, count: before - store.rows.length })
          },
        }
        return deleteBuilder
      },
    }
    return builder
  }
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: store.uid } }, error: null })) },
    from,
    rpc: vi.fn(async (name, args) => {
      if (name === 'update_character_position') {
        const row = store.rows.find(r => r.id === args.p_id)
        if (!row) return { data: null, error: { message: 'not found' } }
        row.data = { ...row.data, position: args.p_position }
        return { data: null, error: null }
      }
      if (name === 'touch_character_last_opened') {
        const row = store.rows.find(r => r.id === args.p_id)
        if (!row) return { data: null, error: { message: 'not found' } }
        row.last_opened_at = new Date().toISOString()
        return { data: null, error: null }
      }
      return { data: null, error: { message: 'unknown rpc: ' + name } }
    }),
  }
})

vi.mock('../lib/supabase', () => ({ supabase: supabaseMock }))

import {
  loadCharacters,
  loadCharacterById,
  upsertCharacter,
  deleteCharacter,
  updateCharacterPosition,
  touchCharacterLastOpened,
  exportAllCharacters,
  importAllCharacters,
} from '../utils/storage'

function makeChar(id, name = 'Frodo', level = 1) {
  return {
    id,
    meta: { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', version: '1.0', schemaVersion: 2 },
    info: { name, race: 'humano', class: 'mago', level, alignment: '' },
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    combat: {
      maxHp: 10, currentHp: 10, tempHp: 0, armorClass: 10, speed: 30,
      hitDice: { pool: { d6: { total: 1, used: 0 } } }, attacks: [],
      deathSaves: { successes: 0, failures: 0 },
    },
    proficiencies: { savingThrows: [], skills: [], expertiseSkills: [], backgroundSkills: [], armor: [], weapons: [], tools: [], languages: [] },
    spellcasting: { ability: null, usedSlots: {}, spells: [] },
    inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] },
    personality: { traits: [], ideals: [], bonds: [], flaws: [] },
    notes: '',
    position: { x: 0.5, y: 0.5 },
  }
}

describe('storage (Supabase backend)', () => {
  beforeEach(() => {
    store.rows = []
  })

  it('loadCharacters() retorna [] quando vazio', async () => {
    const out = await loadCharacters()
    expect(out).toEqual([])
  })

  it('upsertCharacter() insere e loadCharacters() devolve', async () => {
    const r = await upsertCharacter(makeChar('id-a'))
    expect(r.ok).toBe(true)
    const list = await loadCharacters()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('id-a')
    expect(list[0].info.name).toBe('Frodo')
  })

  it('upsertCharacter() rejeita payload inválido (sem persistir)', async () => {
    const bad = { id: 'x', meta: {} } // não passa Zod
    const r = await upsertCharacter(bad)
    expect(r.ok).toBe(false)
    expect(r.errors).toBeTruthy()
    expect(await loadCharacters()).toHaveLength(0)
  })

  it('upsertCharacter() atualiza existente por id', async () => {
    await upsertCharacter(makeChar('id-a', 'Frodo', 1))
    await upsertCharacter(makeChar('id-a', 'Frodo', 5))
    const list = await loadCharacters()
    expect(list).toHaveLength(1)
    expect(list[0].info.level).toBe(5)
  })

  it('loadCharacterById() retorna ficha ou null', async () => {
    await upsertCharacter(makeChar('id-a'))
    expect((await loadCharacterById('id-a')).id).toBe('id-a')
    expect(await loadCharacterById('nope')).toBeNull()
  })

  it('deleteCharacter() remove do storage', async () => {
    await upsertCharacter(makeChar('id-a'))
    await upsertCharacter(makeChar('id-b'))
    const r = await deleteCharacter('id-a')
    expect(r.ok).toBe(true)
    const list = await loadCharacters()
    expect(list.map(c => c.id)).toEqual(['id-b'])
  })

  it('updateCharacterPosition() altera só a posição', async () => {
    await upsertCharacter(makeChar('id-a'))
    const r = await updateCharacterPosition('id-a', { x: 0.1, y: 0.9 })
    expect(r.ok).toBe(true)
    const ch = await loadCharacterById('id-a')
    expect(ch.position).toEqual({ x: 0.1, y: 0.9 })
    expect(ch.info.name).toBe('Frodo') // resto intacto
  })

  it('touchCharacterLastOpened() seta timestamp', async () => {
    await upsertCharacter(makeChar('id-a'))
    const r = await touchCharacterLastOpened('id-a')
    expect(r.ok).toBe(true)
  })

  it('exportAllCharacters() retorna payload de backup', async () => {
    await upsertCharacter(makeChar('id-a', 'Frodo'))
    await upsertCharacter(makeChar('id-b', 'Sam'))
    const payload = await exportAllCharacters()
    expect(payload.app).toBe('dnd-ficha-app')
    expect(payload.count).toBe(2)
    expect(payload.characters).toHaveLength(2)
  })

  it('importAllCharacters() merge sobrescreve por id e adiciona novos', async () => {
    await upsertCharacter(makeChar('id-a', 'Frodo', 1))
    const payload = {
      characters: [makeChar('id-a', 'Frodo', 5), makeChar('id-b', 'Sam', 2)],
    }
    const r = await importAllCharacters(payload, 'merge')
    expect(r.ok).toBe(true)
    expect(r.imported).toBe(2)
    const list = await loadCharacters()
    expect(list).toHaveLength(2)
    expect(list.find(c => c.id === 'id-a').info.level).toBe(5)
  })

  it('importAllCharacters() replace apaga tudo antes', async () => {
    await upsertCharacter(makeChar('id-a'))
    await upsertCharacter(makeChar('id-b'))
    const payload = { characters: [makeChar('id-c', 'Pippin')] }
    const r = await importAllCharacters(payload, 'replace')
    expect(r.ok).toBe(true)
    const list = await loadCharacters()
    expect(list.map(c => c.id)).toEqual(['id-c'])
  })

  it('importAllCharacters() formato inválido → ok:false sem tocar storage', async () => {
    await upsertCharacter(makeChar('id-a'))
    const r = await importAllCharacters({ não: 'reconhecido' }, 'merge')
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('invalid-format')
    expect(await loadCharacters()).toHaveLength(1)
  })
})
