import { describe, it, expect } from 'vitest'
import { characterSchema } from '../systems/dnd5e/domain/characterSchema'

describe('combat.knownBeasts', () => {
  it('default é array vazio quando ausente', () => {
    const parsed = characterSchema.parse({
      id: 'test-1',
      meta: { createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      info: { name: 'Test' },
      attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      combat: { maxHp: 10, currentHp: 10, armorClass: 10 },
      proficiencies: {},
      spellcasting: {},
      inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } },
    })
    expect(parsed.combat.knownBeasts).toEqual([])
  })

  it('preserva índices de bestas fornecidos', () => {
    const parsed = characterSchema.parse({
      id: 'test-2',
      meta: { createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      info: { name: 'Test' },
      attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      combat: {
        maxHp: 10,
        currentHp: 10,
        armorClass: 10,
        knownBeasts: ['wolf', 'brown-bear'],
      },
      proficiencies: {},
      spellcasting: {},
      inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } },
    })
    expect(parsed.combat.knownBeasts).toEqual(['wolf', 'brown-bear'])
  })
})
