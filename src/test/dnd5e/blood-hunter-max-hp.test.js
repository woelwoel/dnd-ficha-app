import { describe, it, expect } from 'vitest'
import { applyHealing, applyDamage, effectiveMaxHp } from '../../systems/dnd5e/domain/rules'
import { BLOOD_HUNTER } from '../../systems/dnd5e/domain/bloodHunter'

function ficha(rites, { currentHp = 20, maxHp = 44 } = {}) {
  return {
    info: { level: 5, classIndex: BLOOD_HUNTER, multiclasses: [] },
    attributes: { wis: 14 },
    combat: { maxHp, currentHp, crimsonRites: rites },
  }
}

const umRito = [{ attackId: 'a1', rite: 'chamas' }]
const doisRitos = [{ attackId: 'a1', rite: 'chamas' }, { attackId: 'a2', rite: 'morto' }]

describe('effectiveMaxHp', () => {
  it('é o teto armazenado quando não há rito', () => {
    expect(effectiveMaxHp(ficha([]))).toBe(44)
  })

  it('desce o nível de personagem por rito ativo', () => {
    expect(effectiveMaxHp(ficha(umRito))).toBe(39)
    expect(effectiveMaxHp(ficha(doisRitos))).toBe(34)
  })

  it('nunca desce abaixo de 1 — teto zero mataria a ficha', () => {
    expect(effectiveMaxHp(ficha(doisRitos, { maxHp: 4 }))).toBe(1)
  })
})

describe('cura respeita o teto reduzido pelo Ritual Vermelho', () => {
  it('cura até o teto cheio sem rito ativo', () => {
    expect(applyHealing(ficha([]), 100).character.combat.currentHp).toBe(44)
  })

  it('não passa do teto reduzido com um rito ativo', () => {
    expect(applyHealing(ficha(umRito), 100).character.combat.currentHp).toBe(39)
  })

  it('não passa do teto reduzido com dois ritos ativos', () => {
    expect(applyHealing(ficha(doisRitos), 100).character.combat.currentHp).toBe(34)
  })
})

describe('morte instantânea usa o teto reduzido pelo rito', () => {
  it('a 0 PV, o dano que alcança o teto REDUZIDO mata na hora', () => {
    const char = ficha(umRito, { currentHp: 0 })
    expect(applyDamage(char, 39).sideEffects.instakill).toBe(true)
  })

  it('a 0 PV, dano abaixo do teto reduzido não mata na hora', () => {
    const char = ficha(umRito, { currentHp: 0 })
    expect(applyDamage(char, 38).sideEffects.instakill).toBe(false)
  })

  it('sem rito, o limiar continua sendo o teto cheio', () => {
    const char = ficha([], { currentHp: 0 })
    expect(applyDamage(char, 39).sideEffects.instakill).toBe(false)
    expect(applyDamage(char, 44).sideEffects.instakill).toBe(true)
  })
})
