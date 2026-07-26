import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCharacterCalculations } from '../systems/dnd5e/hooks/useCharacterCalculations'

/**
 * O paladino nível 2 que escolheu "Defesa" tem de ver o +1 na CA sugerida.
 * Antes, a escolha ficava presa em `chosenFeatures` e nunca chegava ao motor.
 */
const COTA = { id: 'i1', name: 'Cota de Malha', equipped: true, armorKey: 'chain-mail', armorType: 'heavy' }

function paladino({ chosen = {}, items = [COTA] } = {}) {
  return {
    info: { name: 'P', class: 'paladino', level: 2, race: 'humano', multiclasses: [], chosenFeatures: chosen },
    attributes: { str: 16, dex: 10, con: 14, int: 10, wis: 10, cha: 14 },
    combat: { maxHp: 20, currentHp: 20, tempHp: 0, armorClass: 16, speed: 9, activeEffects: [],
      concentrating: { spellIndex: null, spellName: null }, deathSaves: { successes: 0, failures: 0 } },
    proficiencies: { savingThrows: ['wis', 'cha'], skills: [], expertiseSkills: [], armor: ['light', 'medium', 'heavy', 'shield'] },
    spellcasting: { ability: 'cha', usedSlots: {}, pactSlotsUsed: 0, spells: [] },
    inventory: { currency: {}, items },
    traits: {},
  }
}

describe('estilos de combate no calc da ficha', () => {
  it('expõe os estilos ativos do personagem', () => {
    const { result } = renderHook(() =>
      useCharacterCalculations(paladino({ chosen: { fighting_style_paladin: 'defesa' } })))
    expect(result.current.fightingStyles).toEqual(['defense'])
  })

  it('Defesa soma +1 na CA sugerida com armadura equipada', () => {
    const semEstilo = renderHook(() => useCharacterCalculations(paladino())).result.current
    const comEstilo = renderHook(() =>
      useCharacterCalculations(paladino({ chosen: { fighting_style_paladin: 'defesa' } }))).result.current
    expect(semEstilo.suggestedAC).toBe(16) // cota de malha
    expect(comEstilo.suggestedAC).toBe(17)
  })

  it('Defesa também entra na CA efetiva (o número exibido na ficha)', () => {
    const { result } = renderHook(() =>
      useCharacterCalculations(paladino({ chosen: { fighting_style_paladin: 'defesa' } })))
    // combat.armorClass persistido é 16; a sugestão passa a 17
    expect(result.current.suggestedAC).toBe(17)
    expect(result.current.effectiveAC).toBe(16)
  })

  it('sem armadura equipada, Defesa não muda nada', () => {
    const c = paladino({ chosen: { fighting_style_paladin: 'defesa' }, items: [] })
    const { result } = renderHook(() => useCharacterCalculations(c))
    expect(result.current.suggestedAC).toBe(10) // 10 + DES 0
  })
})
