import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useClassSpells } from '../hooks/useClassSpells'

// Mock SrdProvider — devolvemos dados sintéticos suficientes pro hook.
vi.mock('../providers/SrdProvider', () => {
  // Slots full-caster típico do mago.
  const wizardLevels = [
    { class: { index: 'wizard' }, level: 1, spellcasting: { spell_slots_level_1: 2 } },
    { class: { index: 'wizard' }, level: 3, spellcasting: { spell_slots_level_1: 4, spell_slots_level_2: 2 } },
  ]
  // Pact magic: SRD só marca o slot do top level > 0.
  const warlockLevels = [
    { class: { index: 'warlock' }, level: 1, spellcasting: { spell_slots_level_1: 1 } },
    { class: { index: 'warlock' }, level: 3, spellcasting: { spell_slots_level_2: 2 } },
    { class: { index: 'warlock' }, level: 5, spellcasting: { spell_slots_level_3: 2 } },
    { class: { index: 'warlock' }, level: 9, spellcasting: { spell_slots_level_5: 2 } },
  ]
  // Magias cobrindo níveis 0 a 5, marcadas com classes PT.
  const spells = [
    { index: 'eldritch-blast', name: 'Patada Mística', level: 0, classes: ['bruxo'] },
    { index: 'hex',            name: 'Azarar',          level: 1, classes: ['bruxo'] },
    { index: 'invisibility',   name: 'Invisibilidade',  level: 2, classes: ['bruxo', 'mago'] },
    { index: 'fireball',       name: 'Bola de Fogo',    level: 3, classes: ['mago', 'bruxo'] },
    { index: 'banishment',     name: 'Banimento',       level: 4, classes: ['bruxo', 'mago'] },
    { index: 'hold-monster',   name: 'Imobilizar Monstro', level: 5, classes: ['bruxo', 'mago'] },
    { index: 'fire-bolt',      name: 'Raio de Fogo',    level: 0, classes: ['mago'] },
    { index: 'magic-missile',  name: 'Mísseis Mágicos', level: 1, classes: ['mago'] },
  ]
  return {
    useSrd: () => ({ spells, levels: [...wizardLevels, ...warlockLevels] }),
  }
})

describe('useClassSpells — Bruxo (Pact Magic)', () => {
  it('nível 3 expõe tabs [0, 1, 2] mesmo com SRD só marcando slot_level_2 > 0', () => {
    const { result } = renderHook(() => useClassSpells('bruxo', 3))
    expect(result.current.slotLevels).toEqual([1, 2])
    expect(result.current.availableTabs).toEqual([0, 1, 2])
  })

  it('nível 5 expõe tabs [0, 1, 2, 3] (slot pact = 3)', () => {
    const { result } = renderHook(() => useClassSpells('bruxo', 5))
    expect(result.current.slotLevels).toEqual([1, 2, 3])
    expect(result.current.availableTabs).toEqual([0, 1, 2, 3])
  })

  it('nível 9 expõe tabs até 5 (pact slot máximo)', () => {
    const { result } = renderHook(() => useClassSpells('bruxo', 9))
    expect(result.current.slotLevels).toEqual([1, 2, 3, 4, 5])
    expect(result.current.availableTabs).toEqual([0, 1, 2, 3, 4, 5])
  })
})

describe('useClassSpells — Mago (full caster, regressão)', () => {
  it('nível 1 expõe só tabs [0, 1]', () => {
    const { result } = renderHook(() => useClassSpells('mago', 1))
    expect(result.current.slotLevels).toEqual([1])
    expect(result.current.availableTabs).toEqual([0, 1])
  })

  it('nível 3 expõe tabs [0, 1, 2]', () => {
    const { result } = renderHook(() => useClassSpells('mago', 3))
    expect(result.current.slotLevels).toEqual([1, 2])
    expect(result.current.availableTabs).toEqual([0, 1, 2])
  })
})
