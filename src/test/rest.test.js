import { describe, it, expect } from 'vitest'
import { performShortRest, performLongRest } from '../utils/rest'

function base() {
  return {
    info: { class: 'guerreiro', level: 3, multiclasses: [] },
    attributes: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 }, // CON +2
    combat: {
      maxHp: 30,
      currentHp: 10,
      tempHp: 0,
      hitDice: { pool: { d10: { total: 3, used: 0 } } },
      deathSaves: { successes: 0, failures: 0 },
    },
    spellcasting: { usedSlots: { 1: 2, 2: 1 } },
  }
}

describe('performShortRest', () => {
  it('gasta 1 HD e cura (roll + CON)', () => {
    const next = performShortRest(base(), { spent: [{ die: 'd10', roll: 6 }] })
    expect(next.combat.hitDice.pool.d10.used).toBe(1)
    expect(next.combat.currentHp).toBe(18) // 10 + 6 + 2 (CON)
  })

  it('não ultrapassa maxHp', () => {
    const c = { ...base(), combat: { ...base().combat, currentHp: 28 } }
    const next = performShortRest(c, { spent: [{ die: 'd10', roll: 10 }] })
    expect(next.combat.currentHp).toBe(30)
  })

  it('mínimo 1 por HD mesmo com roll negativo', () => {
    const c = { ...base(), attributes: { ...base().attributes, con: 6 } } // CON -2
    const next = performShortRest(c, { spent: [{ die: 'd10', roll: 1 }] })
    // 1 + (-2) = -1 → mín 1
    expect(next.combat.currentHp).toBe(11)
  })

  it('não recupera slots de classes normais', () => {
    const next = performShortRest(base(), { spent: [] })
    expect(next.spellcasting.usedSlots).toEqual({ 1: 2, 2: 1 })
  })

  it('bruxo puro recupera slots em descanso curto', () => {
    const warlock = {
      ...base(),
      info: { class: 'bruxo', level: 3, multiclasses: [] },
      spellcasting: { usedSlots: { 2: 2 } },
    }
    const next = performShortRest(warlock, { spent: [] })
    expect(next.spellcasting.usedSlots).toEqual({})
  })
})

describe('performLongRest', () => {
  it('restaura HP ao máximo e zera tempHp', () => {
    const c = { ...base(), combat: { ...base().combat, currentHp: 5, tempHp: 4 } }
    const next = performLongRest(c)
    expect(next.combat.currentHp).toBe(30)
    expect(next.combat.tempHp).toBe(0)
  })

  it('recupera metade dos HD totais (mín 1)', () => {
    // 3 HD totais, 3 usados → recupera floor(3/2)=1 → used: 2
    const c = base()
    c.combat.hitDice = { pool: { d10: { total: 3, used: 3 } } }
    const next = performLongRest(c)
    expect(next.combat.hitDice.pool.d10.used).toBe(2)
  })

  it('reseta todos os slots de magia', () => {
    const next = performLongRest(base())
    expect(next.spellcasting.usedSlots).toEqual({})
  })

  it('zera testes de morte', () => {
    const c = base()
    c.combat.deathSaves = { successes: 1, failures: 2 }
    const next = performLongRest(c)
    expect(next.combat.deathSaves).toEqual({ successes: 0, failures: 0 })
  })
})
