import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCharacter } from '../systems/dnd5e/hooks/useCharacter'
import { performLongRest } from '../systems/dnd5e/utils/rest'

function seed() {
  return {
    info: { name: 'T', class: 'clerigo', level: 5, race: 'humano', multiclasses: [] },
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 },
    combat: {
      maxHp: 30, currentHp: 30, tempHp: 0, armorClass: 16, speed: 9, attacks: [],
      deathSaves: { successes: 0, failures: 0 },
      concentrating: { spellIndex: null, spellName: null },
      activeEffects: [],
    },
    proficiencies: { savingThrows: [], skills: [], expertiseSkills: [], languages: [] },
    spellcasting: { ability: 'wis', usedSlots: {}, pactSlotsUsed: 0, spells: [] },
    inventory: { currency: {}, items: [] },
    traits: {},
  }
}

const FX = { id: 'escudo-da-fe', name: 'Escudo da Fé', source: 'cast', concentration: true, mods: { ac: 2 }, summary: '+2 CA' }
const MANUAL = { id: 'bencao', name: 'Bênção', source: 'manual', concentration: true, riders: [], summary: '+1d4' }

describe('activeEffects — ciclo de vida', () => {
  it('addActiveEffect faz upsert; removeActiveEffect remove', () => {
    const { result } = renderHook(() => useCharacter(seed()))
    act(() => result.current.addActiveEffect(FX))
    act(() => result.current.addActiveEffect({ ...FX }))
    expect(result.current.character.combat.activeEffects).toHaveLength(1)
    act(() => result.current.removeActiveEffect('escudo-da-fe'))
    expect(result.current.character.combat.activeEffects).toHaveLength(0)
  })

  it('romper concentracao remove efeito cast daquela magia; manual fica', () => {
    const { result } = renderHook(() => useCharacter(seed()))
    act(() => result.current.addActiveEffect(FX))
    act(() => result.current.addActiveEffect(MANUAL))
    act(() => result.current.setConcentration({ index: 'escudo-da-fe', name: 'Escudo da Fé' }))
    act(() => result.current.setConcentration(null))
    const ids = result.current.character.combat.activeEffects.map(e => e.id)
    expect(ids).toEqual(['bencao'])
  })

  it('trocar de magia de concentracao expira o efeito da anterior', () => {
    const { result } = renderHook(() => useCharacter(seed()))
    act(() => result.current.addActiveEffect(FX))
    act(() => result.current.setConcentration({ index: 'escudo-da-fe', name: 'Escudo da Fé' }))
    act(() => result.current.setConcentration({ index: 'bencao', name: 'Bênção' }))
    expect(result.current.character.combat.activeEffects).toHaveLength(0)
  })
})

describe('performLongRest limpa efeitos', () => {
  it('activeEffects vira [] apos descanso longo', () => {
    const char = seed()
    char.combat.activeEffects = [FX, MANUAL]
    const after = performLongRest(char)
    expect(after.combat.activeEffects).toEqual([])
  })
})
