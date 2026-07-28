// src/test/encounter-thresholds.test.js
import { describe, it, expect } from 'vitest'
import { thresholdsForLevel, partyThresholds } from '../systems/dnd5e/domain/encounterDifficulty'

describe('thresholdsForLevel', () => {
  it('bate com a tabela em pontos-chave', () => {
    expect(thresholdsForLevel(1)).toEqual({ easy: 25, medium: 50, hard: 75, deadly: 100 })
    expect(thresholdsForLevel(5)).toEqual({ easy: 250, medium: 500, hard: 750, deadly: 1100 })
    expect(thresholdsForLevel(11)).toEqual({ easy: 800, medium: 1600, hard: 2400, deadly: 3600 })
    expect(thresholdsForLevel(20)).toEqual({ easy: 2800, medium: 5700, hard: 8500, deadly: 12700 })
  })

  it('clampa nível fora de 1..20 em vez de estourar o índice', () => {
    expect(thresholdsForLevel(0)).toEqual(thresholdsForLevel(1))
    expect(thresholdsForLevel(99)).toEqual(thresholdsForLevel(20))
    expect(thresholdsForLevel(undefined)).toEqual(thresholdsForLevel(1))
  })
})

describe('partyThresholds', () => {
  it('soma personagem por personagem', () => {
    expect(partyThresholds([3, 3, 3, 3])).toEqual({ easy: 300, medium: 600, hard: 900, deadly: 1600 })
  })

  it('NÃO usa nível médio — 1/1/5/5 difere de 3/3/3/3', () => {
    const media = partyThresholds([3, 3, 3, 3])
    const real = partyThresholds([1, 1, 5, 5])
    expect(real).toEqual({ easy: 550, medium: 1100, hard: 1650, deadly: 2400 })
    expect(real).not.toEqual(media)
  })

  it('companhia vazia devolve tudo zero', () => {
    expect(partyThresholds([])).toEqual({ easy: 0, medium: 0, hard: 0, deadly: 0 })
    expect(partyThresholds(null)).toEqual({ easy: 0, medium: 0, hard: 0, deadly: 0 })
  })
})
