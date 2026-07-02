import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCharacter } from '../systems/dnd5e/hooks/useCharacter'

describe('useCharacter — spend/regain aceitam lista explícita', () => {
  it('spendFeatureUse(id, list) usa a lista passada e persiste o uso', () => {
    const base = { info: { class: 'bruxo', level: 6 }, combat: { classFeatureUses: [] }, attributes: {} }
    const { result } = renderHook(() => useCharacter(base))
    const list = [{ id: 'bruxo-sub-insondavel-1-x', name: 'Tentáculo', max: 3, used: 0, recharge: 'long', source: 'bruxo' }]
    act(() => result.current.spendFeatureUse('bruxo-sub-insondavel-1-x', list))
    const saved = result.current.character.combat.classFeatureUses.find(u => u.id === 'bruxo-sub-insondavel-1-x')
    expect(saved.used).toBe(1)
  })

  it('gasto SEM lista (ex.: ManeuversPanel) não zera tracker de subclasse persistido', () => {
    // Guerreiro Mestre de Combate 3 (dado de superioridade = tracker hardcoded)
    // com um tracker de subclasse já gasto persistido (id fora dos defaults deste
    // hook, pois depende de classChoices). Gastar o dado sem passar lista NÃO
    // pode descartar o `used` do tracker de subclasse.
    const base = {
      info: { class: 'guerreiro', level: 3, chosenFeatures: { martial_archetype: 'mestre_combate' } },
      attributes: {},
      combat: { classFeatureUses: [
        { id: 'guerreiro-sub-arcano-2-x', name: 'Feature de subclasse', max: 2, used: 1, recharge: 'long', source: 'guerreiro' },
      ] },
    }
    const { result } = renderHook(() => useCharacter(base))
    act(() => result.current.spendFeatureUse('guerreiro-superiority-dice')) // sem lista
    const sub = result.current.character.combat.classFeatureUses.find(u => u.id === 'guerreiro-sub-arcano-2-x')
    expect(sub).toBeTruthy()
    expect(sub.used).toBe(1) // preservado
  })
})
