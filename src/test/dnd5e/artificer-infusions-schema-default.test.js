import { describe, it, expect } from 'vitest'
import { safeParseCharacter } from '../../systems/dnd5e/domain/characterSchema'

// Ficha mínima válida (espelha character-sources-default.test.js).
function minimal(overrides = {}) {
  return {
    id: 'c1', meta: { createdAt: 'x', updatedAt: 'x' },
    info: { name: 'T' }, attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    combat: { maxHp: 10, currentHp: 10, armorClass: 10 },
    proficiencies: {}, inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } },
    ...overrides,
  }
}

describe('combat.artificerInfusions default', () => {
  it('ficha legada materializa { known: [], active: [] }', () => {
    const res = safeParseCharacter(minimal())
    expect(res.success).toBe(true)
    expect(res.data.combat.artificerInfusions).toEqual({ known: [], active: [] })
  })
  it('preserva valores declarados', () => {
    const res = safeParseCharacter(minimal({
      combat: { maxHp: 10, currentHp: 10, armorClass: 10,
        artificerInfusions: { known: ['arma-aprimorada'], active: [{ infusion: 'arma-aprimorada', itemId: 'i1' }] } },
    }))
    expect(res.data.combat.artificerInfusions.known).toEqual(['arma-aprimorada'])
    expect(res.data.combat.artificerInfusions.active[0]).toEqual({ infusion: 'arma-aprimorada', itemId: 'i1' })
  })
})
