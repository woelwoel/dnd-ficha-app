import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useClassSpells } from '../systems/dnd5e/hooks/useClassSpells'

vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useSrd: () => ({
    spells: [
      { index: 'bola-de-fogo', level: 3, classes: ['feiticeiro', 'mago'] },
      { index: 'curar-ferimentos', level: 1, classes: ['clerigo'] },
    ],
    levels: [{ class: { index: 'sorcerer' }, level: 3, spellcasting: { spell_slots_level_1: 4, spell_slots_level_2: 3, spell_slots_level_3: 2 } }],
    progression: {},
  }),
}))

describe('useClassSpells — Alma Favorecida', () => {
  it('sem extraClasses, feiticeiro não vê magia de clérigo', () => {
    const { result } = renderHook(() => useClassSpells('feiticeiro', 3))
    expect(result.current.classSpells.map(s => s.index)).toEqual(['bola-de-fogo'])
  })
  it('com extraClasses [clerigo], une as duas listas', () => {
    const { result } = renderHook(() => useClassSpells('feiticeiro', 3, { extraClasses: ['clerigo'] }))
    expect(result.current.classSpells.map(s => s.index).sort()).toEqual(['bola-de-fogo', 'curar-ferimentos'])
  })
})
