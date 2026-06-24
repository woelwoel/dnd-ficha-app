import { describe, it, expect } from 'vitest'
import { getSpellSlots } from '../../utils/spellcasting'

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
