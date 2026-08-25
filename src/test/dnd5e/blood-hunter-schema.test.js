import { describe, it, expect } from 'vitest'
import { parseCharacter } from '../../systems/dnd5e/domain/characterSchema'

// Ficha mínima válida (espelha artificer-infusions-schema-default.test.js).
function minimal(overrides = {}) {
  return {
    id: 'c1', meta: { createdAt: 'x', updatedAt: 'x' },
    info: { name: 'Teste' }, attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    combat: { maxHp: 10, currentHp: 10, armorClass: 10 },
    proficiencies: {}, inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } },
    ...overrides,
  }
}

describe('schema — combat.crimsonRites', () => {
  it('nasce como lista vazia numa ficha que não declara o campo', () => {
    const doc = parseCharacter(minimal())
    expect(doc.combat.crimsonRites).toEqual([])
  })

  it('preserva os ritos gravados', () => {
    const doc = parseCharacter(minimal({
      combat: { maxHp: 10, currentHp: 10, armorClass: 10,
        crimsonRites: [{ attackId: 'a1', rite: 'chamas' }] },
    }))
    expect(doc.combat.crimsonRites).toEqual([{ attackId: 'a1', rite: 'chamas' }])
  })

  it('descarta rito sem arma em vez de rejeitar a ficha inteira', () => {
    const doc = parseCharacter(minimal({
      combat: { maxHp: 10, currentHp: 10, armorClass: 10,
        crimsonRites: [{ rite: 'chamas' }] },
    }))
    expect(doc.combat.crimsonRites).toEqual([])
  })
})
