import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCharacter } from '../systems/dnd5e/hooks/useCharacter'

describe('useCharacter.toggleKnownBeast', () => {
  it('adiciona índice ausente e remove índice presente', () => {
    const { result } = renderHook(() => useCharacter({ combat: { knownBeasts: [] } }))

    act(() => result.current.toggleKnownBeast('wolf'))
    expect(result.current.character.combat.knownBeasts).toContain('wolf')

    act(() => result.current.toggleKnownBeast('wolf'))
    expect(result.current.character.combat.knownBeasts).not.toContain('wolf')
  })

  it('não duplica índice já presente', () => {
    const { result } = renderHook(() => useCharacter({ combat: { knownBeasts: ['eagle'] } }))
    act(() => result.current.toggleKnownBeast('wolf'))
    expect(result.current.character.combat.knownBeasts).toEqual(['eagle', 'wolf'])
  })
})
