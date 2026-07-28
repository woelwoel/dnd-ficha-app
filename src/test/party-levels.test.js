// src/test/party-levels.test.js
import { describe, it, expect } from 'vitest'
import { characterLevel, partyLevels } from '../systems/dnd5e/domain/party'

describe('characterLevel', () => {
  it('soma a classe primária com as multiclasses', () => {
    expect(characterLevel({ info: { level: 3, multiclasses: [{ level: 2 }, { level: 1 }] } })).toBe(6)
  })

  it('ficha sem multiclasse usa só o nível primário', () => {
    expect(characterLevel({ info: { level: 5 } })).toBe(5)
  })

  it('clampa em 1..20 pra não estourar a tabela de limiares', () => {
    expect(characterLevel({ info: { level: 0 } })).toBe(1)
    expect(characterLevel({ info: { level: 25 } })).toBe(20)
    expect(characterLevel({ info: { level: 18, multiclasses: [{ level: 9 }] } })).toBe(20)
  })

  it('lixo e ausência viram nível 1', () => {
    expect(characterLevel({})).toBe(1)
    expect(characterLevel(null)).toBe(1)
    expect(characterLevel({ info: { level: 'abc' } })).toBe(1)
  })
})

describe('partyLevels', () => {
  it('aceita mapa de docs (como a tela guarda)', () => {
    const docs = { a: { info: { level: 3 } }, b: { info: { level: 5 } } }
    expect(partyLevels(docs)).toEqual([3, 5])
  })

  it('aceita lista de docs', () => {
    expect(partyLevels([{ info: { level: 2 } }])).toEqual([2])
  })

  it('vazio devolve lista vazia', () => {
    expect(partyLevels(null)).toEqual([])
    expect(partyLevels({})).toEqual([])
  })
})
