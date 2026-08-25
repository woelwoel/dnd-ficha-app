import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCharacterCalculations } from '../../systems/dnd5e/hooks/useCharacterCalculations'
import { BLOOD_HUNTER, LYCAN, ORDER_CHOICE_ID } from '../../systems/dnd5e/domain/bloodHunter'

const COURO = { id: 'i1', name: 'Couro Batido', qty: 1, equipped: true, armorKey: 'studded-leather', armorType: 'light' }
const PLACAS = { id: 'i2', name: 'Placas', qty: 1, equipped: true, armorKey: 'plate', armorType: 'heavy' }

function ficha({ hybrid = false, order = LYCAN, items = [COURO] } = {}) {
  return {
    info: {
      name: 'T', class: BLOOD_HUNTER, level: 5, race: 'humano', multiclasses: [],
      chosenFeatures: { [ORDER_CHOICE_ID]: order },
    },
    attributes: { str: 16, dex: 14, con: 14, int: 10, wis: 14, cha: 10 },
    combat: {
      maxHp: 44, currentHp: 44, tempHp: 0, armorClass: 15, speed: 9, activeEffects: [],
      hybridForm: hybrid, crimsonRites: [],
      concentrating: { spellIndex: null, spellName: null }, deathSaves: { successes: 0, failures: 0 },
    },
    proficiencies: { savingThrows: ['str', 'wis'], skills: [], expertiseSkills: [], armor: ['light', 'medium'] },
    spellcasting: { ability: null, usedSlots: {}, pactSlotsUsed: 0, spells: [] },
    inventory: { currency: {}, items },
    traits: {},
  }
}

const calc = char => renderHook(() => useCharacterCalculations(char)).result.current

describe('Pele Resistente na ficha — CA efetiva', () => {
  it('fora da forma híbrida, a CA efetiva é a base', () => {
    expect(calc(ficha()).effectiveAC).toBe(15)
  })

  it('na forma híbrida com armadura leve, sobe 1', () => {
    expect(calc(ficha({ hybrid: true })).effectiveAC).toBe(16)
  })

  it('na forma híbrida com armadura pesada, não sobe', () => {
    expect(calc(ficha({ hybrid: true, items: [PLACAS] })).effectiveAC).toBe(15)
  })

  it('não sobe para outra Ordem, mesmo com o flag ligado', () => {
    expect(calc(ficha({ hybrid: true, order: 'cacador-de-espectros' })).effectiveAC).toBe(15)
  })

  /** Mesmo contrato do effectiveAC de magia: o valor editável não é tocado. */
  it('não contamina a CA sugerida', () => {
    const normal = calc(ficha())
    const transformado = calc(ficha({ hybrid: true }))
    expect(transformado.suggestedAC).toBe(normal.suggestedAC)
  })
})
