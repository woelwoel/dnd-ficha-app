import { describe, it, expect, beforeEach } from 'vitest'
import { loadCharacters, saveCharacters, loadCharacterById, upsertCharacter, deleteCharacter } from '../utils/storage'

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
