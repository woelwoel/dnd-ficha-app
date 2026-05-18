import { describe, it, expect, beforeEach } from 'vitest'
import { loadCharacters, saveCharacters, loadCharacterById, upsertCharacter, deleteCharacter, updateCharacterPosition, touchCharacterLastOpened, exportAllCharacters, importAllCharacters } from '../utils/storage'

// Fixture mínimo que passa pela validação Zod do characterSchema
function makeChar(id, name = 'Teste', extra = {}) {
  const now = new Date().toISOString()
  return {
    id,
    meta: { createdAt: now, updatedAt: now, version: '1.0' },
    info: { name, level: 1, xp: 0, scoreMethod: 'manual' },
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    appliedRacialBonuses: {},
    combat: { maxHp: 10, currentHp: 10, armorClass: 10 },
    proficiencies: {},
    spellcasting: {},
    inventory: { currency: {}, items: [] },
    traits: {},
    ...extra,
  }
}

describe('storage helpers — localStorage resiliente', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retorna array vazio quando storage está vazio', () => {
    expect(loadCharacters()).toEqual([])
  })

  it('retorna array vazio quando JSON está corrompido', () => {
    localStorage.setItem('dnd-app-characters', '{invalid}}}')
    expect(loadCharacters()).toEqual([])
  })

  it('retorna array vazio quando valor salvo não é array', () => {
    localStorage.setItem('dnd-app-characters', JSON.stringify({ foo: 'bar' }))
    expect(loadCharacters()).toEqual([])
  })

  it('persiste e carrega personagens corretamente', () => {
    saveCharacters([makeChar('1', 'Teste')])
    const loaded = loadCharacters()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('1')
    expect(loaded[0].info.name).toBe('Teste')
  })

  it('upsert insere novo personagem', () => {
    upsertCharacter(makeChar('abc', 'Novo'))
    expect(loadCharacters()).toHaveLength(1)
    expect(loadCharacters()[0].id).toBe('abc')
  })

  it('upsert atualiza personagem existente sem duplicar', () => {
    const c = makeChar('abc', 'Original')
    upsertCharacter(c)
    upsertCharacter({ ...c, info: { ...c.info, name: 'Atualizado' } })
    const all = loadCharacters()
    expect(all).toHaveLength(1)
    expect(all[0].info.name).toBe('Atualizado')
  })

  it('deleteCharacter remove o personagem correto', () => {
    upsertCharacter(makeChar('1', 'A'))
    upsertCharacter(makeChar('2', 'B'))
    deleteCharacter('1')
    const all = loadCharacters()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('2')
  })

  it('loadCharacterById retorna null quando id não existe', () => {
    expect(loadCharacterById('inexistente')).toBeNull()
  })

  it('loadCharacterById retorna o personagem correto', () => {
    upsertCharacter(makeChar('x', 'X'))
    expect(loadCharacterById('x').info.name).toBe('X')
  })

  it('loadCharacters descarta personagens inválidos', () => {
    const valid = makeChar('ok', 'Ok')
    const invalid = { id: 'bad', info: { name: 'Lixo' } } // faltam campos
    localStorage.setItem('dnd-app-characters', JSON.stringify([valid, invalid]))
    const loaded = loadCharacters()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('ok')
  })
})

describe('updateCharacterPosition', () => {
  beforeEach(() => localStorage.clear())

  it('persiste position no character', () => {
    upsertCharacter(makeChar('p1'))
    const res = updateCharacterPosition('p1', { x: 0.3, y: 0.7 })
    expect(res.ok).toBe(true)
    const reloaded = loadCharacterById('p1')
    expect(reloaded.position).toEqual({ x: 0.3, y: 0.7 })
  })

  it('clampa posições inválidas para [0, 1]', () => {
    upsertCharacter(makeChar('p2'))
    updateCharacterPosition('p2', { x: 1.5, y: -0.2 })
    const reloaded = loadCharacterById('p2')
    expect(reloaded.position.x).toBe(1)
    expect(reloaded.position.y).toBe(0)
  })

  it('é no-op para ID inexistente', () => {
    const res = updateCharacterPosition('nao-existe', { x: 0.5, y: 0.5 })
    expect(res.ok).toBe(false)
  })
})

describe('touchCharacterLastOpened', () => {
  beforeEach(() => localStorage.clear())

  it('grava timestamp lastOpenedAt em ms', () => {
    upsertCharacter(makeChar('t1'))
    const before = Date.now()
    touchCharacterLastOpened('t1')
    const reloaded = loadCharacterById('t1')
    expect(reloaded.lastOpenedAt).toBeGreaterThanOrEqual(before)
    expect(reloaded.lastOpenedAt).toBeLessThanOrEqual(Date.now())
  })

  it('é no-op para ID inexistente', () => {
    const res = touchCharacterLastOpened('nao-existe')
    expect(res.ok).toBe(false)
  })
})

describe('exportAllCharacters / importAllCharacters', () => {
  beforeEach(() => localStorage.clear())

  it('exporta payload com metadados + lista de personagens', () => {
    upsertCharacter(makeChar('a', 'Aragorn'))
    upsertCharacter(makeChar('b', 'Boromir'))
    const payload = exportAllCharacters()
    expect(payload.app).toBe('dnd-ficha-app')
    expect(payload.count).toBe(2)
    expect(payload.characters).toHaveLength(2)
    expect(typeof payload.exportedAt).toBe('string')
  })

  it('importa em modo replace substituindo tudo', () => {
    upsertCharacter(makeChar('a', 'Aragorn'))
    const payload = { characters: [makeChar('z', 'Zelda')] }
    const res = importAllCharacters(payload, 'replace')
    expect(res.ok).toBe(true)
    expect(res.imported).toBe(1)
    const all = loadCharacters()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('z')
  })

  it('importa em modo merge preservando atuais e sobrescrevendo por id', () => {
    upsertCharacter(makeChar('a', 'Aragorn'))
    upsertCharacter(makeChar('b', 'Boromir'))
    const payload = { characters: [makeChar('a', 'Aragorn Renomeado'), makeChar('c', 'Cirdan')] }
    const res = importAllCharacters(payload, 'merge')
    expect(res.ok).toBe(true)
    expect(res.imported).toBe(2)
    const all = loadCharacters()
    expect(all).toHaveLength(3)
    expect(all.find(c => c.id === 'a').info.name).toBe('Aragorn Renomeado')
    expect(all.find(c => c.id === 'b').info.name).toBe('Boromir')
    expect(all.find(c => c.id === 'c')).toBeDefined()
  })

  it('aceita array bruto como payload (compatibilidade)', () => {
    const res = importAllCharacters([makeChar('x', 'Xenon')], 'replace')
    expect(res.ok).toBe(true)
    expect(loadCharacters()).toHaveLength(1)
  })

  it('falha com reason invalid-format para payload irreconhecível', () => {
    const res = importAllCharacters({ foo: 'bar' })
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('invalid-format')
  })

  it('conta personagens inválidos sem abortar quando há ao menos um válido', () => {
    const res = importAllCharacters({ characters: [makeChar('ok', 'Bom'), { id: 'bad' }] }, 'replace')
    expect(res.ok).toBe(true)
    expect(res.imported).toBe(1)
    expect(res.invalid).toBe(1)
  })

  it('falha com no-valid-characters quando nenhum passa schema', () => {
    const res = importAllCharacters({ characters: [{ id: 'bad' }] })
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('no-valid-characters')
  })

  it('não toca storage quando payload é inválido', () => {
    upsertCharacter(makeChar('keep', 'Mantido'))
    importAllCharacters('nope')
    expect(loadCharacters()).toHaveLength(1)
    expect(loadCharacterById('keep')).toBeTruthy()
  })
})
