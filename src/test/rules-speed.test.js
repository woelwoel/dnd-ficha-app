import { describe, it, expect } from 'vitest'
import { classSpeedBonusMeters, baseSpeedMeters } from '../systems/dnd5e/domain/rules'
import { calculateMaxHpFromHitDice, racialHpPerLevel } from '../systems/dnd5e/utils/calculations'

const char = info => ({ info })

describe('classSpeedBonusMeters (PHB)', () => {
  it('Bárbaro Movimento Rápido: +3m a partir do nível 5', () => {
    expect(classSpeedBonusMeters(char({ class: 'barbaro', level: 4, multiclasses: [] }))).toBe(0)
    expect(classSpeedBonusMeters(char({ class: 'barbaro', level: 5, multiclasses: [] }))).toBe(3)
  })
  it('Monge Movimento sem Armadura escala por nível', () => {
    expect(classSpeedBonusMeters(char({ class: 'monge', level: 1, multiclasses: [] }))).toBe(0)
    expect(classSpeedBonusMeters(char({ class: 'monge', level: 2, multiclasses: [] }))).toBe(3)
    expect(classSpeedBonusMeters(char({ class: 'monge', level: 6, multiclasses: [] }))).toBe(4.5)
    expect(classSpeedBonusMeters(char({ class: 'monge', level: 10, multiclasses: [] }))).toBe(6)
    expect(classSpeedBonusMeters(char({ class: 'monge', level: 15, multiclasses: [] }))).toBe(7.5)
    expect(classSpeedBonusMeters(char({ class: 'monge', level: 18, multiclasses: [] }))).toBe(9)
  })
})

describe('baseSpeedMeters', () => {
  it('Tiefling (9m) Bárbaro 15 = 12m', () => {
    expect(baseSpeedMeters(char({ class: 'barbaro', level: 15, multiclasses: [] }), 9)).toBe(12)
  })
  it('Halfling (7,5m) Monge 15 = 15m', () => {
    expect(baseSpeedMeters(char({ class: 'monge', level: 15, multiclasses: [] }), 7.5)).toBe(15)
  })
  it('raça sem speed → padrão 9m', () => {
    expect(baseSpeedMeters(char({ class: 'mago', level: 5, multiclasses: [] }), undefined)).toBe(9)
  })
})

describe('racialHpPerLevel + Tenacidade Anã', () => {
  it('Anão da Colina concede +1/nível', () => {
    expect(racialHpPerLevel('anao-da-colina')).toBe(1)
    expect(racialHpPerLevel('anao-da-montanha')).toBe(0)
  })
  it('HP do Anão da Colina Bardo 15 (CON 16) = 138', () => {
    // d8 nv1: 8+3=11; média d8+3 = 8 → 14 níveis × 8 = 112; +1/nível × 15 = 15
    const hp = calculateMaxHpFromHitDice({
      primaryDie: 8, primaryLevel: 15, conScore: 16, racialHpPerLevel: 1,
    })
    expect(hp).toBe(138)
  })
})
