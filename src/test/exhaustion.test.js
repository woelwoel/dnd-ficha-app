// Testes da tabela de exaustão PHB p.291.
import { describe, it, expect } from 'vitest'
import { getExhaustionEffects } from '../utils/calculations'

describe('getExhaustionEffects', () => {
  it('nível 0: sem penalidade', () => {
    const e = getExhaustionEffects(0)
    expect(e).toEqual({
      level: 0,
      abilityCheckDisadvantage: false,
      attackDisadvantage: false,
      saveDisadvantage: false,
      speedMultiplier: 1,
      maxHpMultiplier: 1,
      dead: false,
    })
  })

  it('nível 1: desvantagem em testes de habilidade', () => {
    const e = getExhaustionEffects(1)
    expect(e.abilityCheckDisadvantage).toBe(true)
    expect(e.attackDisadvantage).toBe(false)
    expect(e.speedMultiplier).toBe(1)
  })

  it('nível 2: velocidade pela metade', () => {
    const e = getExhaustionEffects(2)
    expect(e.speedMultiplier).toBe(0.5)
    expect(e.attackDisadvantage).toBe(false)
  })

  it('nível 3: desvantagem em ataques e salvaguardas', () => {
    const e = getExhaustionEffects(3)
    expect(e.attackDisadvantage).toBe(true)
    expect(e.saveDisadvantage).toBe(true)
    expect(e.speedMultiplier).toBe(0.5)
    expect(e.maxHpMultiplier).toBe(1)
  })

  it('nível 4: PV máx pela metade', () => {
    const e = getExhaustionEffects(4)
    expect(e.maxHpMultiplier).toBe(0.5)
    expect(e.speedMultiplier).toBe(0.5)
  })

  it('nível 5: velocidade a 0', () => {
    const e = getExhaustionEffects(5)
    expect(e.speedMultiplier).toBe(0)
    expect(e.maxHpMultiplier).toBe(0.5)
  })

  it('nível 6: morte', () => {
    const e = getExhaustionEffects(6)
    expect(e.dead).toBe(true)
  })

  it('clampa em 0..6', () => {
    expect(getExhaustionEffects(-3).level).toBe(0)
    expect(getExhaustionEffects(99).level).toBe(6)
    expect(getExhaustionEffects(99).dead).toBe(true)
  })

  it('aceita string e null', () => {
    expect(getExhaustionEffects('3').attackDisadvantage).toBe(true)
    expect(getExhaustionEffects(null).level).toBe(0)
    expect(getExhaustionEffects().level).toBe(0)
  })
})
