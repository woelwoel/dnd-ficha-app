import { describe, it, expect } from 'vitest'
import { getSpellSlots, getSpellcastingRules } from '../../utils/spellcasting'

describe('Artífice — slots de meio-conjurador (começa nv1, ceil)', () => {
  it('nível 1: 2 slots de 1º círculo', () => {
    expect(getSpellSlots('artifice', 1, [])).toEqual({ 1: 2 })
  })
  it('nível 5: 4 de 1º, 2 de 2º', () => {
    expect(getSpellSlots('artifice', 5, [])).toEqual({ 1: 4, 2: 2 })
  })
  it('nível 20: 4/3/3/3/2 (até 5º círculo)', () => {
    expect(getSpellSlots('artifice', 20, [])).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 })
  })
})

describe('Paladino/Patrulheiro NÃO mudam (não conjuram no nv1)', () => {
  it('paladino nv1: sem slots', () => {
    expect(getSpellSlots('paladino', 1, [])).toBeNull()
  })
  it('paladino nv5: 4/2', () => {
    expect(getSpellSlots('paladino', 5, [])).toEqual({ 1: 4, 2: 2 })
  })
})

describe('Artífice — magias preparadas (INT mod + metade do nível, mín 1, desde nv1)', () => {
  it('nível 1, INT 16: prepara 3 magias (max(1, mod 3 + floor(1/2)=0)); tem truques', () => {
    const r = getSpellcastingRules('artifice', 1, { int: 16 }, { cantrips_known: 2 })
    expect(r.type).toBe('prepared')
    expect(r.ability).toBe('int')
    expect(r.spellsLimit).toBe(3)
    expect(r.cantripsLimit).toBe(2)
  })
  it('nível 1, INT 10: mínimo de 1 magia', () => {
    expect(getSpellcastingRules('artifice', 1, { int: 10 }, {}).spellsLimit).toBe(1)
  })
  it('nível 5, INT 16: 3 + floor(5/2)=2 = 5 magias', () => {
    expect(getSpellcastingRules('artifice', 5, { int: 16 }, {}).spellsLimit).toBe(5)
  })
  it('paladino nv1 continua 0 (regressão)', () => {
    expect(getSpellcastingRules('paladino', 1, { cha: 16 }, {}).spellsLimit).toBe(0)
  })
})
