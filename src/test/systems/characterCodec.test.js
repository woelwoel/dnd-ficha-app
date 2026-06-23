import { describe, it, expect } from 'vitest'
import { parseCharacterDispatch, migrateCharacterDispatch } from '../../utils/characterCodec'

const valid = {
  id: '00000000-0000-4000-8000-000000000001',
  meta: { createdAt: 'a', updatedAt: 'b' },
  info: { name: 'X', class: 'guerreiro', race: 'humano', level: 1 },
  attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  combat: { maxHp: 10, currentHp: 10, armorClass: 10 },
  proficiencies: {},
  spellcasting: {},
  inventory: { currency: {} },
}

describe('characterCodec dispatch', () => {
  it('ficha legada (sem system) valida pelo dnd5e', () => {
    const r = parseCharacterDispatch(valid)
    expect(r.success).toBe(true)
    expect(r.data.system).toBe('dnd5e')
  })

  it('sistema desconhecido falha graciosamente (sem throw)', () => {
    const r = parseCharacterDispatch({ ...valid, system: 'daggerheart' })
    expect(r.success).toBe(false)
    expect(Array.isArray(r.error.issues)).toBe(true)
  })

  it('migrate desconhecido devolve o raw intocado', () => {
    const raw = { ...valid, system: 'daggerheart' }
    expect(migrateCharacterDispatch(raw)).toBe(raw)
  })
})
