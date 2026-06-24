import { describe, it, expect } from 'vitest'
import { safeParseCharacter } from '../../systems/dnd5e/domain/characterSchema'

// Ficha mínima válida. Ajuste os campos obrigatórios conforme o schema real
// exigir (rode o teste; o erro Zod aponta o que falta).
function minimalCharacter(overrides = {}) {
  return {
    id: 'c1',
    meta: { createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    info: { name: 'Teste' },
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    combat: { maxHp: 10, currentHp: 10, armorClass: 10 },
    proficiencies: {},
    inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 } },
    ...overrides,
  }
}

describe('ficha — sources default', () => {
  it('ficha legada sem settings.sources cai em ["phb"]', () => {
    const res = safeParseCharacter(minimalCharacter())
    expect(res.success).toBe(true)
    expect(res.data.meta.settings.sources).toEqual(['phb'])
  })

  it('preserva sources declaradas', () => {
    const res = safeParseCharacter(minimalCharacter({
      meta: { createdAt: 'x', updatedAt: 'x', settings: { sources: ['phb', 'tasha'] } },
    }))
    expect(res.success).toBe(true)
    expect(res.data.meta.settings.sources).toEqual(['phb', 'tasha'])
  })
})
