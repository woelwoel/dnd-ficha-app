import { describe, it, expect } from 'vitest'
import { exhaustionEffects, exhaustionLevelsText } from '../../systems/dnd5e/domain/exhaustion'
import { effectiveSpeed, effectiveMaxHp } from '../../systems/dnd5e/domain/rules'

const ficha = (level, ruleset = '2014') => ({
  meta: { ruleset },
  combat: { exhaustion: level },
})

describe('exaustão 2014 (PHB p.291 — tabela de 6 degraus)', () => {
  it('nível 0: tudo neutro', () => {
    expect(exhaustionEffects(ficha(0))).toEqual({
      level: 0, dead: false,
      abilityCheckDisadvantage: false, attackDisadvantage: false, saveDisadvantage: false,
      speedMultiplier: 1, maxHpMultiplier: 1,
      d20Penalty: 0, speedPenaltyMeters: 0,
    })
  })

  it('nível 1: desvantagem em testes de habilidade', () => {
    const e = exhaustionEffects(ficha(1))
    expect(e.abilityCheckDisadvantage).toBe(true)
    expect(e.attackDisadvantage).toBe(false)
    expect(e.saveDisadvantage).toBe(false)
    expect(e.speedMultiplier).toBe(1)
  })

  it('nível 2: deslocamento à metade', () => {
    expect(exhaustionEffects(ficha(2)).speedMultiplier).toBe(0.5)
  })

  it('nível 3: desvantagem também em ataques e salvaguardas', () => {
    const e = exhaustionEffects(ficha(3))
    expect(e.attackDisadvantage).toBe(true)
    expect(e.saveDisadvantage).toBe(true)
  })

  it('nível 4: PV máximo à metade', () => {
    expect(exhaustionEffects(ficha(4)).maxHpMultiplier).toBe(0.5)
  })

  it('nível 5: deslocamento zero', () => {
    expect(exhaustionEffects(ficha(5)).speedMultiplier).toBe(0)
  })

  it('nível 6: morte', () => {
    expect(exhaustionEffects(ficha(6)).dead).toBe(true)
  })

  it('os campos do ramo 2024 saem neutros', () => {
    for (const lvl of [0, 1, 3, 6]) {
      const e = exhaustionEffects(ficha(lvl))
      expect(e.d20Penalty).toBe(0)
      expect(e.speedPenaltyMeters).toBe(0)
    }
  })
})

describe('exaustão 2024 (LdJ 2024, Ap. C p.368 — acumulativa)', () => {
  it('nível 0: tudo neutro', () => {
    expect(exhaustionEffects(ficha(0, '2024'))).toEqual({
      level: 0, dead: false,
      abilityCheckDisadvantage: false, attackDisadvantage: false, saveDisadvantage: false,
      speedMultiplier: 1, maxHpMultiplier: 1,
      d20Penalty: 0, speedPenaltyMeters: 0,
    })
  })

  it('testes de d20 reduzidos em 2 × nível', () => {
    expect(exhaustionEffects(ficha(1, '2024')).d20Penalty).toBe(-2)
    expect(exhaustionEffects(ficha(3, '2024')).d20Penalty).toBe(-6)
    expect(exhaustionEffects(ficha(5, '2024')).d20Penalty).toBe(-10)
  })

  it('deslocamento reduzido em 1,5 m × nível', () => {
    expect(exhaustionEffects(ficha(1, '2024')).speedPenaltyMeters).toBe(1.5)
    expect(exhaustionEffects(ficha(4, '2024')).speedPenaltyMeters).toBe(6)
  })

  it('nível 6 mata, como no 2014', () => {
    expect(exhaustionEffects(ficha(6, '2024')).dead).toBe(true)
  })

  it('os campos do ramo 2014 saem neutros — sem desvantagem, sem multiplicador', () => {
    for (const lvl of [1, 2, 3, 4, 5]) {
      const e = exhaustionEffects(ficha(lvl, '2024'))
      expect(e.abilityCheckDisadvantage).toBe(false)
      expect(e.attackDisadvantage).toBe(false)
      expect(e.saveDisadvantage).toBe(false)
      expect(e.speedMultiplier).toBe(1)
      expect(e.maxHpMultiplier).toBe(1)
    }
  })
})

describe('clamp e entradas malformadas', () => {
  it('clampa fora da faixa 0-6 nos dois rulesets', () => {
    expect(exhaustionEffects(ficha(-3)).level).toBe(0)
    expect(exhaustionEffects(ficha(99)).level).toBe(6)
    expect(exhaustionEffects(ficha(99, '2024')).d20Penalty).toBe(-12)
  })

  it('ficha sem combat vira nível 0', () => {
    expect(exhaustionEffects({}).level).toBe(0)
    expect(exhaustionEffects(null).level).toBe(0)
  })

  it('exaustão não numérica vira nível 0', () => {
    expect(exhaustionEffects({ meta: { ruleset: '2014' }, combat: { exhaustion: 'abc' } }).level).toBe(0)
    expect(exhaustionEffects({ meta: { ruleset: '2024' }, combat: { exhaustion: null } }).level).toBe(0)
  })
})

describe('exhaustionLevelsText', () => {
  it('2014 devolve 7 entradas (níveis 0 a 6)', () => {
    const t = exhaustionLevelsText({ meta: { ruleset: '2014' } })
    expect(t).toHaveLength(7)
    expect(t[6]).toMatch(/[Mm]orte/)
  })

  it('2024 descreve a regra acumulativa, não a tabela', () => {
    const t = exhaustionLevelsText({ meta: { ruleset: '2024' } })
    expect(t).toHaveLength(7)
    expect(t[1]).toMatch(/-2|−2/)
    expect(t[6]).toMatch(/[Mm]orte/)
  })
})

describe('effectiveSpeed com exaustão', () => {
  const anda = (exhaustion, ruleset, speed = 9, conditions = []) =>
    effectiveSpeed({ meta: { ruleset }, combat: { speed, exhaustion, conditions } })

  it('2014: metade no nível 2, zero no 5', () => {
    expect(anda(0, '2014')).toBe(9)
    expect(anda(1, '2014')).toBe(9)
    expect(anda(2, '2014')).toBe(4.5)
    expect(anda(4, '2014')).toBe(4.5)
    expect(anda(5, '2014')).toBe(0)
  })

  it('2024: subtrai 1,5 m por nível', () => {
    expect(anda(0, '2024')).toBe(9)
    expect(anda(1, '2024')).toBe(7.5)
    expect(anda(4, '2024')).toBe(3)
  })

  it('2024: piso 0, nunca negativo', () => {
    expect(anda(5, '2024', 6)).toBe(0)
    expect(anda(6, '2024', 9)).toBe(0)
  })

  it('condição que zera o deslocamento vence nos dois rulesets', () => {
    expect(anda(0, '2014', 9, ['grappled'])).toBe(0)
    expect(anda(0, '2024', 9, ['grappled'])).toBe(0)
  })

  it('ficha legada sem meta continua sob a regra 2014', () => {
    expect(effectiveSpeed({ combat: { speed: 9, exhaustion: 2 } })).toBe(4.5)
  })
})

describe('effectiveMaxHp com exaustão', () => {
  const pv = (exhaustion, ruleset, maxHp = 40) =>
    effectiveMaxHp({ meta: { ruleset }, combat: { maxHp, exhaustion } })

  it('2014: nível 4 corta o PV máximo pela metade (regra que nunca funcionou)', () => {
    expect(pv(3, '2014')).toBe(40)
    expect(pv(4, '2014')).toBe(20)
    expect(pv(5, '2014')).toBe(20)
  })

  it('2024: exaustão não mexe no PV máximo', () => {
    expect(pv(4, '2024')).toBe(40)
    expect(pv(5, '2024')).toBe(40)
  })

  it('piso 1: nunca devolve 0 ou negativo', () => {
    expect(pv(4, '2014', 1)).toBe(1)
  })

  it('arredonda para baixo, como toda divisão de PV no PHB', () => {
    expect(pv(4, '2014', 41)).toBe(20)
  })

  it('ficha legada sem meta segue a regra 2014', () => {
    expect(effectiveMaxHp({ combat: { maxHp: 40, exhaustion: 4 } })).toBe(20)
  })
})
