// src/test/encounter-multiplier.test.js
import { describe, it, expect } from 'vitest'
import { encounterMultiplier, MULTIPLIER_LADDER } from '../systems/dnd5e/domain/encounterDifficulty'

const GRUPO_NORMAL = 4

describe('encounterMultiplier — faixas por quantidade', () => {
  it('cobre as seis faixas', () => {
    expect(encounterMultiplier(1, GRUPO_NORMAL)).toBe(1)
    expect(encounterMultiplier(2, GRUPO_NORMAL)).toBe(1.5)
    expect(encounterMultiplier(3, GRUPO_NORMAL)).toBe(2)
    expect(encounterMultiplier(6, GRUPO_NORMAL)).toBe(2)
    expect(encounterMultiplier(7, GRUPO_NORMAL)).toBe(2.5)
    expect(encounterMultiplier(10, GRUPO_NORMAL)).toBe(2.5)
    expect(encounterMultiplier(11, GRUPO_NORMAL)).toBe(3)
    expect(encounterMultiplier(14, GRUPO_NORMAL)).toBe(3)
    expect(encounterMultiplier(15, GRUPO_NORMAL)).toBe(4)
    expect(encounterMultiplier(40, GRUPO_NORMAL)).toBe(4)
  })

  it('sem monstro não multiplica nada', () => {
    expect(encounterMultiplier(0, GRUPO_NORMAL)).toBe(1)
  })
})

describe('encounterMultiplier — ajuste por tamanho do grupo', () => {
  it('companhia pequena (1-2) sobe um degrau', () => {
    expect(encounterMultiplier(1, 2)).toBe(1.5)
    expect(encounterMultiplier(3, 2)).toBe(2.5)
    expect(encounterMultiplier(15, 1)).toBe(4)
  })

  it('companhia grande (6+) desce um degrau, incluindo o ×0,5', () => {
    expect(encounterMultiplier(1, 6)).toBe(0.5)
    expect(encounterMultiplier(2, 6)).toBe(1)
    expect(encounterMultiplier(3, 7)).toBe(1.5)
  })

  it('grupo de 3 a 5 não desloca', () => {
    for (const tamanho of [3, 4, 5]) {
      expect(encounterMultiplier(3, tamanho)).toBe(2)
    }
  })

  it('companhia vazia não aplica o bônus de grupo pequeno', () => {
    expect(encounterMultiplier(3, 0)).toBe(2)
  })

  it('a escada tem sete posições e começa no meio-multiplicador', () => {
    expect(MULTIPLIER_LADDER).toEqual([0.5, 1, 1.5, 2, 2.5, 3, 4])
  })
})
