import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCharacter } from '../hooks/useCharacter'

describe('useCharacter — spend/regain aceitam lista explícita', () => {
  it('spendFeatureUse(id, list) usa a lista passada e persiste o uso', () => {
    const base = { info: { class: 'bruxo', level: 6 }, combat: { classFeatureUses: [] }, attributes: {} }
    const { result } = renderHook(() => useCharacter(base))
    const list = [{ id: 'bruxo-sub-insondavel-1-x', name: 'Tentáculo', max: 3, used: 0, recharge: 'long', source: 'bruxo' }]
    act(() => result.current.spendFeatureUse('bruxo-sub-insondavel-1-x', list))
    const saved = result.current.character.combat.classFeatureUses.find(u => u.id === 'bruxo-sub-insondavel-1-x')
    expect(saved.used).toBe(1)
  })
})
