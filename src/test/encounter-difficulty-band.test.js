// src/test/encounter-difficulty-band.test.js
import { describe, it, expect } from 'vitest'
import {
  adjustedXp, difficultyBand, summarizeEncounter, partyThresholds,
} from '../systems/dnd5e/domain/encounterDifficulty'

const QUATRO_NV3 = [3, 3, 3, 3] // limiares: 300 / 600 / 900 / 1600

describe('adjustedXp', () => {
  it('aplica o multiplicador da quantidade', () => {
    expect(adjustedXp(200, 4, 4)).toBe(400)
    expect(adjustedXp(200, 1, 4)).toBe(200)
    expect(adjustedXp(200, 2, 4)).toBe(300)
  })

  it('arredonda meio XP em vez de deixar fração na tela', () => {
    expect(adjustedXp(25, 2, 4)).toBe(38)
  })

  it('lixo e negativo viram zero', () => {
    expect(adjustedXp(-50, 3, 4)).toBe(0)
    expect(adjustedXp('abc', 3, 4)).toBe(0)
  })
})

describe('difficultyBand — igual entra na faixa de cima', () => {
  const t = partyThresholds(QUATRO_NV3)

  it('bate exatamente nas fronteiras', () => {
    expect(difficultyBand(299, t)).toBe('trivial')
    expect(difficultyBand(300, t)).toBe('easy')
    expect(difficultyBand(599, t)).toBe('easy')
    expect(difficultyBand(600, t)).toBe('medium')
    expect(difficultyBand(899, t)).toBe('medium')
    expect(difficultyBand(900, t)).toBe('hard')
    expect(difficultyBand(1599, t)).toBe('hard')
    expect(difficultyBand(1600, t)).toBe('deadly')
    expect(difficultyBand(99999, t)).toBe('deadly')
  })

  it('sem companhia não inventa faixa', () => {
    expect(difficultyBand(500, partyThresholds([]))).toBeNull()
    expect(difficultyBand(500, null)).toBeNull()
  })
})

describe('summarizeEncounter', () => {
  it('junta tudo num resumo pronto pra tela', () => {
    expect(summarizeEncounter({ monsterXpTotal: 150, monsterCount: 3, levels: QUATRO_NV3 }))
      .toEqual({
        raw: 150,
        adjusted: 300,
        multiplier: 2,
        partySize: 4,
        thresholds: { easy: 300, medium: 600, hard: 900, deadly: 1600 },
        band: 'easy',
      })
  })

  it('encontro vazio é trivial, não quebra', () => {
    const r = summarizeEncounter({ monsterXpTotal: 0, monsterCount: 0, levels: QUATRO_NV3 })
    expect(r.adjusted).toBe(0)
    expect(r.band).toBe('trivial')
  })

  it('sem companhia devolve band null e partySize 0', () => {
    const r = summarizeEncounter({ monsterXpTotal: 500, monsterCount: 2, levels: [] })
    expect(r).toMatchObject({ band: null, partySize: 0, adjusted: 750 })
  })
})
