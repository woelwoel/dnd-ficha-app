import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTabValidation } from '../systems/dnd5e/hooks/useTabValidation'

/**
 * O diálogo "Identidade" da ficha v2 recebe `getTabErrors('ficha')` direto,
 * sem nenhum passo prévio de "marcar aba como tocada" — o gate de troca de
 * aba que fazia essa marcação morreu junto com o layout v1. Estes testes
 * fixam o contrato novo: os erros valem no primeiro render.
 */

const RACES = [
  { index: 'elfo', name: 'Elfo', subraces: [{ index: 'alto-elfo', name: 'Alto Elfo' }] },
  { index: 'humano', name: 'Humano', subraces: [] },
  {
    index: 'meio-elfo',
    name: 'Meio-Elfo',
    optionalSubrace: true,
    subraces: [{ index: 'variante', name: 'Variante' }],
  },
]

function makeCharacter(overrides = {}) {
  return {
    info: { name: 'Thorin', race: 'humano', subrace: '', class: 'guerreiro', level: 5, ...overrides.info },
    attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 8, ...overrides.attributes },
    combat: { armorClass: 16, maxHp: 40, currentHp: 30, ...overrides.combat },
    spellcasting: { ability: null, ...overrides.spellcasting },
  }
}

function fichaErrors(character, races = RACES) {
  const { result } = renderHook(() => useTabValidation(character, { races }))
  return result.current.getTabErrors('ficha')
}

describe('useTabValidation — erros valem no primeiro render', () => {
  it('ficha completa não acusa erro', () => {
    expect(fichaErrors(makeCharacter())).toEqual({})
  })

  it('nome vazio acusa erro sem nenhuma interação prévia', () => {
    const errors = fichaErrors(makeCharacter({ info: { name: '   ' } }))
    expect(errors.name).toBe('Nome é obrigatório')
  })

  it('raça vazia acusa erro', () => {
    expect(fichaErrors(makeCharacter({ info: { race: '' } })).race).toBe('Raça é obrigatória')
  })

  it('classe vazia acusa erro', () => {
    expect(fichaErrors(makeCharacter({ info: { class: '' } })).class).toBe('Classe é obrigatória')
  })

  it('raça com sub-raça obrigatória e nenhuma escolhida acusa erro', () => {
    const errors = fichaErrors(makeCharacter({ info: { race: 'elfo', subrace: '' } }))
    expect(errors.subrace).toBe('Sub-raça é obrigatória para Elfo')
  })

  it('raça com sub-raça opcional não acusa erro', () => {
    const errors = fichaErrors(makeCharacter({ info: { race: 'meio-elfo', subrace: '' } }))
    expect(errors.subrace).toBeUndefined()
  })
})

describe('useTabValidation — teto de atributo acompanha o editor da ficha v2', () => {
  it('atributo 24 (item mágico) é válido', () => {
    expect(fichaErrors(makeCharacter({ attributes: { str: 24 } })).attr_str).toBeUndefined()
  })

  it('atributo 30 (teto do editor) é válido', () => {
    expect(fichaErrors(makeCharacter({ attributes: { con: 30 } })).attr_con).toBeUndefined()
  })

  it('atributo 31 acusa erro', () => {
    expect(fichaErrors(makeCharacter({ attributes: { cha: 31 } })).attr_cha)
      .toBe('Carisma: valor deve estar entre 1 e 30')
  })

  it('atributo 0 acusa erro', () => {
    expect(fichaErrors(makeCharacter({ attributes: { dex: 0 } })).attr_dex)
      .toBe('Destreza: valor deve estar entre 1 e 30')
  })
})

describe('useTabValidation — superfície do hook', () => {
  it('expõe só os validadores que a ficha v2 consome', () => {
    const { result } = renderHook(() => useTabValidation(makeCharacter(), { races: RACES }))
    expect(Object.keys(result.current).sort()).toEqual(['getTabErrors', 'validateTab'])
  })
})
