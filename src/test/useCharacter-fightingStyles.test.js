import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCharacter } from '../systems/dnd5e/hooks/useCharacter'

/**
 * Equipar/desequipar armadura reescreve `combat.armorClass` na hora. Esse
 * caminho tem seu próprio cálculo de CA e também precisa conhecer o Estilo
 * de Combate Defesa — senão equipar a armadura zerava o +1.
 */
const COTA = { id: 'i1', name: 'Cota de Malha', equipped: false, armorKey: 'chain-mail', armorType: 'heavy' }

function paladinoDefesa() {
  return {
    info: {
      class: 'paladino', level: 2, multiclasses: [],
      chosenFeatures: { fighting_style_paladin: 'defesa' },
    },
    attributes: { str: 16, dex: 10, con: 14, int: 10, wis: 10, cha: 14 },
    combat: { armorClass: 10 },
    proficiencies: { armor: ['light', 'medium', 'heavy', 'shield'] },
    inventory: { items: [COTA] },
  }
}

describe('useCharacter.updateItem — CA ao equipar armadura', () => {
  it('inclui o +1 do estilo Defesa', () => {
    const { result } = renderHook(() => useCharacter(paladinoDefesa()))
    act(() => result.current.updateItem('i1', { equipped: true }))
    expect(result.current.character.combat.armorClass).toBe(17) // 16 + 1
  })

  it('sem o estilo, mantém a CA nua da armadura', () => {
    const base = paladinoDefesa()
    base.info.chosenFeatures = {}
    const { result } = renderHook(() => useCharacter(base))
    act(() => result.current.updateItem('i1', { equipped: true }))
    expect(result.current.character.combat.armorClass).toBe(16)
  })
})
