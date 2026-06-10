// Testes para a camada pura de dano/cura/testes de morte em rules.js.
// Cobre PHB p.197 (massive damage, testes de morte) e p.198 (tempHp).
import { describe, it, expect, vi } from 'vitest'
import {
  applyDamage, applyHealing, gainTempHp,
  stabilizeCharacter, rollDeathSave,
  setConcentration,
} from '../domain/rules'

function makeChar(overrides = {}) {
  const { combat: combatOverrides, ...rest } = overrides
  return {
    id: 'c1',
    info: { class: 'guerreiro', level: 5, multiclasses: [] },
    attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
    proficiencies: {},
    spellcasting: {},
    inventory: { currency: {} },
    traits: {},
    ...rest,
    combat: {
      maxHp: 50, currentHp: 50, tempHp: 0,
      armorClass: 16, speed: 30,
      deathSaves: { successes: 0, failures: 0 },
      isDead: false, isStable: false,
      concentrating: { spellIndex: null, spellName: null },
      ...combatOverrides,
    },
  }
}

describe('applyDamage', () => {
  it('zero ou negativo é no-op', () => {
    const c = makeChar()
    expect(applyDamage(c, 0).character).toBe(c)
    expect(applyDamage(c, -5).character.combat.currentHp).toBe(50)
  })

  it('drena tempHp antes do currentHp', () => {
    const c = makeChar({ combat: { tempHp: 8 } })
    const { character, sideEffects } = applyDamage(c, 5)
    expect(character.combat.tempHp).toBe(3)
    expect(character.combat.currentHp).toBe(50)
    expect(sideEffects.damageDealt).toBe(5)
  })

  it('overflow de tempHp passa para currentHp', () => {
    const c = makeChar({ combat: { tempHp: 5 } })
    const { character } = applyDamage(c, 12)
    expect(character.combat.tempHp).toBe(0)
    expect(character.combat.currentHp).toBe(43)
  })

  it('clampa currentHp em 0', () => {
    const c = makeChar({ combat: { currentHp: 5 } })
    const { character, sideEffects } = applyDamage(c, 99)
    expect(character.combat.currentHp).toBe(0)
    expect(sideEffects.droppedTo0).toBe(true)
  })

  it('droppedTo0 zera deathSaves anteriores', () => {
    const c = makeChar({ combat: { currentHp: 5, deathSaves: { successes: 2, failures: 1 } } })
    const { character } = applyDamage(c, 5)
    expect(character.combat.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('massive damage: dano remanescente >= maxHp causa instakill', () => {
    // maxHp=50, currentHp=10, damage=70 → drop to 0, remaining=60 >= 50 → morte
    const c = makeChar({ combat: { currentHp: 10 } })
    const { character, sideEffects } = applyDamage(c, 70)
    expect(sideEffects.instakill).toBe(true)
    expect(character.combat.isDead).toBe(true)
    expect(character.combat.currentHp).toBe(0)
    expect(character.combat.deathSaves.failures).toBe(3)
  })

  it('massive damage: dano remanescente < maxHp NÃO causa instakill', () => {
    // maxHp=50, currentHp=10, damage=30 → drop to 0, remaining=20 < 50 → só cai
    const c = makeChar({ combat: { currentHp: 10 } })
    const { character, sideEffects } = applyDamage(c, 30)
    expect(sideEffects.instakill).toBe(false)
    expect(character.combat.isDead).toBe(false)
    expect(character.combat.currentHp).toBe(0)
    expect(sideEffects.droppedTo0).toBe(true)
  })

  it('dano em personagem já a 0 HP: +1 falha de morte', () => {
    const c = makeChar({ combat: { currentHp: 0, deathSaves: { successes: 1, failures: 1 } } })
    const { character, sideEffects } = applyDamage(c, 5)
    expect(character.combat.deathSaves).toEqual({ successes: 1, failures: 2 })
    expect(sideEffects.deathSaveFailuresApplied).toBe(1)
    expect(character.combat.isDead).toBe(false)
  })

  it('crítico em personagem a 0 HP: +2 falhas', () => {
    const c = makeChar({ combat: { currentHp: 0, deathSaves: { successes: 0, failures: 1 } } })
    const { character, sideEffects } = applyDamage(c, 5, { critical: true })
    expect(character.combat.deathSaves).toEqual({ successes: 0, failures: 3 })
    expect(sideEffects.deathSaveFailuresApplied).toBe(2)
    expect(character.combat.isDead).toBe(true)
    expect(sideEffects.died).toBe(true)
  })

  it('dano >= maxHp em personagem a 0 HP: instakill mesmo sem crit', () => {
    const c = makeChar({ combat: { currentHp: 0, maxHp: 30 } })
    const { character, sideEffects } = applyDamage(c, 30)
    expect(sideEffects.instakill).toBe(true)
    expect(character.combat.isDead).toBe(true)
  })

  it('dano em personagem estabilizado remove isStable', () => {
    const c = makeChar({ combat: { currentHp: 0, isStable: true } })
    const { character } = applyDamage(c, 3)
    expect(character.combat.isStable).toBe(false)
    expect(character.combat.deathSaves.failures).toBe(1)
  })

  it('dano em personagem morto é no-op', () => {
    const c = makeChar({ combat: { currentHp: 0, isDead: true } })
    const out = applyDamage(c, 100)
    expect(out.character).toBe(c)
  })

  it('gera concentrationCheckDC quando há concentração ativa', () => {
    const c = setConcentration(makeChar(), { index: 'bless', name: 'Bênção' })
    const { sideEffects } = applyDamage(c, 22)
    // DC = max(10, floor(22/2)) = max(10, 11) = 11
    expect(sideEffects.concentrationCheckDC).toBe(11)
  })

  it('concentrationCheckDC mínimo é 10 mesmo com dano pequeno', () => {
    const c = setConcentration(makeChar(), { index: 'bless', name: 'Bênção' })
    const { sideEffects } = applyDamage(c, 5)
    expect(sideEffects.concentrationCheckDC).toBe(10)
  })

  it('sem concentração não gera DC', () => {
    const c = makeChar()
    const { sideEffects } = applyDamage(c, 50)
    expect(sideEffects.concentrationCheckDC).toBeNull()
  })
})

describe('applyHealing', () => {
  it('zero é no-op', () => {
    const c = makeChar({ combat: { currentHp: 25 } })
    expect(applyHealing(c, 0).character).toBe(c)
  })

  it('soma HP até o máximo', () => {
    const c = makeChar({ combat: { currentHp: 20 } })
    const { character, sideEffects } = applyHealing(c, 15)
    expect(character.combat.currentHp).toBe(35)
    expect(sideEffects.healed).toBe(15)
  })

  it('clampa em maxHp', () => {
    const c = makeChar({ combat: { currentHp: 45 } })
    const { character, sideEffects } = applyHealing(c, 100)
    expect(character.combat.currentHp).toBe(50)
    expect(sideEffects.healed).toBe(5)
  })

  it('não restaura tempHp', () => {
    const c = makeChar({ combat: { currentHp: 30, tempHp: 0 } })
    const { character } = applyHealing(c, 10)
    expect(character.combat.tempHp).toBe(0)
  })

  it('cura de 0 HP zera testes de morte', () => {
    const c = makeChar({ combat: { currentHp: 0, deathSaves: { successes: 2, failures: 2 } } })
    const { character, sideEffects } = applyHealing(c, 5)
    expect(character.combat.currentHp).toBe(5)
    expect(character.combat.deathSaves).toEqual({ successes: 0, failures: 0 })
    expect(sideEffects.revived).toBe(true)
  })

  it('cura de 0 HP limpa isStable', () => {
    const c = makeChar({ combat: { currentHp: 0, isStable: true } })
    const { character } = applyHealing(c, 5)
    expect(character.combat.isStable).toBe(false)
  })

  it('morto não pode ser curado', () => {
    const c = makeChar({ combat: { currentHp: 0, isDead: true } })
    const out = applyHealing(c, 50)
    expect(out.character).toBe(c)
    expect(out.sideEffects.revived).toBe(false)
  })
})

describe('gainTempHp', () => {
  it('aplica quando não há temp atual', () => {
    const c = makeChar()
    const { character } = gainTempHp(c, 8)
    expect(character.combat.tempHp).toBe(8)
  })

  it('substitui pelo maior (não acumula — PHB p.198)', () => {
    const c = makeChar({ combat: { tempHp: 5 } })
    const { character } = gainTempHp(c, 8)
    expect(character.combat.tempHp).toBe(8)
  })

  it('mantém o atual se novo é menor', () => {
    const c = makeChar({ combat: { tempHp: 10 } })
    const { character } = gainTempHp(c, 6)
    expect(character.combat.tempHp).toBe(10)
  })
})

describe('stabilizeCharacter', () => {
  it('estabiliza personagem a 0 HP', () => {
    const c = makeChar({ combat: { currentHp: 0, deathSaves: { successes: 1, failures: 2 } } })
    const next = stabilizeCharacter(c)
    expect(next.combat.isStable).toBe(true)
    expect(next.combat.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('no-op para personagem consciente', () => {
    const c = makeChar({ combat: { currentHp: 10 } })
    expect(stabilizeCharacter(c)).toBe(c)
  })

  it('no-op para morto', () => {
    const c = makeChar({ combat: { currentHp: 0, isDead: true } })
    expect(stabilizeCharacter(c)).toBe(c)
  })
})

describe('rollDeathSave', () => {
  it('Nat 20: recupera com 1 HP, zera death saves e isStable', () => {
    const c = makeChar({ combat: { currentHp: 0, deathSaves: { successes: 2, failures: 2 } } })
    const { character, result } = rollDeathSave(c, { roll: 20 })
    expect(result.recovered).toBe(true)
    expect(character.combat.currentHp).toBe(1)
    expect(character.combat.deathSaves).toEqual({ successes: 0, failures: 0 })
    expect(character.combat.isStable).toBe(false)
  })

  it('Nat 1: 2 falhas', () => {
    const c = makeChar({ combat: { currentHp: 0, deathSaves: { successes: 0, failures: 0 } } })
    const { character, result } = rollDeathSave(c, { roll: 1 })
    expect(result.twoFails).toBe(true)
    expect(result.failure).toBe(true)
    expect(character.combat.deathSaves).toEqual({ successes: 0, failures: 2 })
  })

  it('10-19: sucesso (+1)', () => {
    const c = makeChar({ combat: { currentHp: 0 } })
    const { character, result } = rollDeathSave(c, { roll: 12 })
    expect(result.success).toBe(true)
    expect(character.combat.deathSaves.successes).toBe(1)
  })

  it('1-9 (não-1): falha (+1)', () => {
    const c = makeChar({ combat: { currentHp: 0 } })
    const { character, result } = rollDeathSave(c, { roll: 5 })
    expect(result.failure).toBe(true)
    expect(result.twoFails).toBe(false)
    expect(character.combat.deathSaves.failures).toBe(1)
  })

  it('3 sucessos: estabiliza e zera death saves', () => {
    const c = makeChar({ combat: { currentHp: 0, deathSaves: { successes: 2, failures: 1 } } })
    const { character, result } = rollDeathSave(c, { roll: 15 })
    expect(result.stabilized).toBe(true)
    expect(character.combat.isStable).toBe(true)
    expect(character.combat.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('3 falhas: morte (isDead=true)', () => {
    const c = makeChar({ combat: { currentHp: 0, deathSaves: { successes: 1, failures: 2 } } })
    const { character, result } = rollDeathSave(c, { roll: 5 })
    expect(result.died).toBe(true)
    expect(character.combat.isDead).toBe(true)
  })

  it('Nat 1 com 1 falha pré-existente: morte (1+2=3)', () => {
    const c = makeChar({ combat: { currentHp: 0, deathSaves: { successes: 0, failures: 1 } } })
    const { character, result } = rollDeathSave(c, { roll: 1 })
    expect(result.died).toBe(true)
    expect(character.combat.isDead).toBe(true)
  })

  it('bloqueia se personagem consciente', () => {
    const c = makeChar({ combat: { currentHp: 10 } })
    const { character, result } = rollDeathSave(c, { roll: 10 })
    expect(result.blocked).toBe('conscious')
    expect(character).toBe(c)
  })

  it('bloqueia se já morto', () => {
    const c = makeChar({ combat: { currentHp: 0, isDead: true } })
    const { result } = rollDeathSave(c, { roll: 15 })
    expect(result.blocked).toBe('dead')
  })

  it('bloqueia se estabilizado', () => {
    const c = makeChar({ combat: { currentHp: 0, isStable: true } })
    const { result } = rollDeathSave(c, { roll: 15 })
    expect(result.blocked).toBe('stable')
  })

  it('roll aleatório quando não passado', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const c = makeChar({ combat: { currentHp: 0 } })
    const { result } = rollDeathSave(c)
    expect(result.roll).toBe(11) // floor(0.5*20)+1 = 11
    expect(result.success).toBe(true)
    spy.mockRestore()
  })

  it('random=0 produz 1 (nunca 0) — fix do ceil', () => {
    // Antes: Math.ceil(0*20) = 0 (impossível num d20). Agora: floor(0)+1 = 1.
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const c = makeChar({ combat: { currentHp: 0 } })
    const { result } = rollDeathSave(c)
    expect(result.roll).toBe(1)
    spy.mockRestore()
  })

  it('limites: roll inválido ignora e re-rola', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.95)
    const c = makeChar({ combat: { currentHp: 0 } })
    const { result } = rollDeathSave(c, { roll: 50 }) // inválido
    expect(result.roll).toBeGreaterThanOrEqual(1)
    expect(result.roll).toBeLessThanOrEqual(20)
    spy.mockRestore()
  })
})
