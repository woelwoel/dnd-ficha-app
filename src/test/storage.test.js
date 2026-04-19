import { describe, it, expect, beforeEach } from 'vitest'
import { loadCharacters, saveCharacters, loadCharacterById, upsertCharacter, deleteCharacter } from '../utils/storage'

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
    const chars = [{ id: '1', info: { name: 'Teste' } }]
    saveCharacters(chars)
    expect(loadCharacters()).toEqual(chars)
  })

  it('upsert insere novo personagem', () => {
    const c = { id: 'abc', info: { name: 'Novo' } }
    upsertCharacter(c)
    expect(loadCharacters()).toHaveLength(1)
    expect(loadCharacters()[0].id).toBe('abc')
  })

  it('upsert atualiza personagem existente sem duplicar', () => {
    const c = { id: 'abc', info: { name: 'Original' } }
    upsertCharacter(c)
    upsertCharacter({ ...c, info: { name: 'Atualizado' } })
    const all = loadCharacters()
    expect(all).toHaveLength(1)
    expect(all[0].info.name).toBe('Atualizado')
  })

  it('deleteCharacter remove o personagem correto', () => {
    upsertCharacter({ id: '1', info: { name: 'A' } })
    upsertCharacter({ id: '2', info: { name: 'B' } })
    deleteCharacter('1')
    const all = loadCharacters()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('2')
  })

  it('loadCharacterById retorna null quando id não existe', () => {
    expect(loadCharacterById('inexistente')).toBeNull()
  })

  it('loadCharacterById retorna o personagem correto', () => {
    upsertCharacter({ id: 'x', info: { name: 'X' } })
    expect(loadCharacterById('x').info.name).toBe('X')
  })
})
