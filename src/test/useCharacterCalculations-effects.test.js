import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCharacterCalculations } from '../systems/dnd5e/hooks/useCharacterCalculations'

function baseChar(activeEffects = []) {
  return {
    info: { name: 'T', class: 'clerigo', level: 5, race: 'humano', multiclasses: [] },
    attributes: { str: 10, dex: 14, con: 10, int: 10, wis: 16, cha: 10 },
    combat: { maxHp: 30, currentHp: 30, tempHp: 0, armorClass: 16, speed: 9, activeEffects,
      concentrating: { spellIndex: null, spellName: null }, deathSaves: { successes: 0, failures: 0 } },
    proficiencies: { savingThrows: ['wis'], skills: [], expertiseSkills: [], armor: [] },
    spellcasting: { ability: 'wis', usedSlots: {}, pactSlotsUsed: 0, spells: [] },
    inventory: { currency: {}, items: [] },
    traits: {},
  }
}

const ESCUDO = { id: 'escudo-da-fe', name: 'Escudo da Fé', source: 'cast', concentration: true, mods: { ac: 2 }, summary: '+2 CA' }
const VELOC  = { id: 'velocidade', name: 'Velocidade', source: 'manual', concentration: true, mods: { ac: 2, speedMultiplier: 2 }, summary: 'x2' }
const AURA   = { id: 'x', name: 'X', source: 'manual', mods: { saves: 1, saveAbility: { dex: 2 } }, summary: 's' }

describe('calc com efeitos ativos', () => {
  it('sem efeitos: effectiveAC = base, effectiveSpeed = base', () => {
    const { result } = renderHook(() => useCharacterCalculations(baseChar()))
    expect(result.current.effectiveAC).toBe(16)
    expect(result.current.effectiveSpeed).toBe(9)
    expect(result.current.effectBreakdown).toEqual([])
  })
  it('Escudo da Fe: effectiveAC = 18; suggestedAC NAO muda', () => {
    const plain = renderHook(() => useCharacterCalculations(baseChar())).result.current
    const buffed = renderHook(() => useCharacterCalculations(baseChar([ESCUDO]))).result.current
    expect(buffed.effectiveAC).toBe(18)
    expect(buffed.suggestedAC).toBe(plain.suggestedAC)
  })
  it('Velocidade: speed (9) x2 = 18 e CA +2 (com Escudo: 16+4=20)', () => {
    const { result } = renderHook(() => useCharacterCalculations(baseChar([ESCUDO, VELOC])))
    expect(result.current.effectiveSpeed).toBe(18)
    expect(result.current.effectiveAC).toBe(20)
  })
  it('saves de efeito entram no savingThrows (geral + por atributo)', () => {
    const plain = renderHook(() => useCharacterCalculations(baseChar())).result.current
    const buffed = renderHook(() => useCharacterCalculations(baseChar([AURA]))).result.current
    expect(buffed.savingThrows.dex).toBe(plain.savingThrows.dex + 3)  // +1 geral +2 dex
    expect(buffed.savingThrows.wis).toBe(plain.savingThrows.wis + 1)
  })
  it('effectBreakdown lista nome e resumo dos efeitos', () => {
    const { result } = renderHook(() => useCharacterCalculations(baseChar([ESCUDO])))
    expect(result.current.effectBreakdown).toEqual([{ id: 'escudo-da-fe', name: 'Escudo da Fé', summary: '+2 CA' }])
  })
})
