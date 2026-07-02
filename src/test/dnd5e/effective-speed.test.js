import { describe, it, expect } from 'vitest'
import { effectiveSpeed } from '../../systems/dnd5e/domain/rules'

const char = (speed, conditions = [], exhaustion = 0) => ({
  combat: { speed, conditions, exhaustion },
})

describe('effectiveSpeed (PHB p.290-291)', () => {
  it('sem condição: velocidade base', () => {
    expect(effectiveSpeed(char(9))).toBe(9)
  })
  it('condições que impedem movimento zeram o deslocamento', () => {
    for (const c of ['grappled', 'restrained', 'paralyzed', 'petrified', 'stunned', 'unconscious']) {
      expect(effectiveSpeed(char(9, [c])), c).toBe(0)
    }
  })
  it('exaustão 2+: metade (metros fracionários ok)', () => {
    expect(effectiveSpeed(char(9, [], 2))).toBe(4.5)
    expect(effectiveSpeed(char(9, [], 4))).toBe(4.5)
  })
  it('exaustão 1: sem efeito no deslocamento', () => {
    expect(effectiveSpeed(char(9, [], 1))).toBe(9)
  })
  it('exaustão 5+: 0', () => {
    expect(effectiveSpeed(char(9, [], 5))).toBe(0)
  })
  it('condição vence exaustão (0 é 0)', () => {
    expect(effectiveSpeed(char(9, ['grappled'], 2))).toBe(0)
  })
  it('combat ausente: assume base 9 sem quebrar', () => {
    expect(effectiveSpeed({})).toBe(9)
  })
})
