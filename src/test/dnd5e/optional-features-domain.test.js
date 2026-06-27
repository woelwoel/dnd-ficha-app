import { describe, it, expect } from 'vitest'
import {
  isOptionalChoice, isAdditionChoice, getOptionalVariants, getChosenAdditions,
} from '../../systems/dnd5e/domain/optionalFeatures'

// Simula choices JÁ mesclados (options carimbadas com source pelo mergeClassChoices)
const subst = {
  id: 'ranger_deft_explorer', featureName: 'Explorador Natural', optional: true, level: 1,
  options: [{ value: 'habil', name: 'Hábil', desc: 'x'.repeat(50), source: 'tasha' }],
}
const addition = {
  id: 'druid_wild_companion', addsFeature: true, optional: true, level: 2,
  options: [{ value: 'companheiro_animal', name: 'Companheiro Animal', desc: 'y'.repeat(50), category: 'magia', source: 'tasha' }],
}
const required = {
  id: 'ranger_archetype', featureName: 'Arquétipo do Patrulheiro', level: 3,
  options: [{ value: 'cacador', name: 'Caçador', desc: 'z'.repeat(50) }],
}
const clazz = { choices: [subst, addition, required] }

describe('optionalFeatures — classificadores', () => {
  it('isOptionalChoice só marca quem tem optional:true', () => {
    expect(isOptionalChoice(subst)).toBe(true)
    expect(isOptionalChoice(addition)).toBe(true)
    expect(isOptionalChoice(required)).toBe(false)
  })
  it('isAdditionChoice: adição é optional sem featureName (ou addsFeature)', () => {
    expect(isAdditionChoice(addition)).toBe(true)
    expect(isAdditionChoice(subst)).toBe(false)   // tem featureName → substituição
    expect(isAdditionChoice(required)).toBe(false)
  })
})

describe('getOptionalVariants — lista pro toggle, gated por fonte e nível', () => {
  it('com Tasha ativo, devolve as 2 opcionais até o nível', () => {
    const v = getOptionalVariants(clazz, 20, ['phb', 'tasha'])
    expect(v.map(c => c.id)).toEqual(['ranger_deft_explorer', 'druid_wild_companion'])
  })
  it('sem Tasha, options de tasha somem → nenhuma variante', () => {
    const v = getOptionalVariants(clazz, 20, ['phb'])
    expect(v).toHaveLength(0)
  })
  it('respeita o teto de nível', () => {
    const v = getOptionalVariants(clazz, 1, ['phb', 'tasha'])
    expect(v.map(c => c.id)).toEqual(['ranger_deft_explorer'])
  })
})

describe('getChosenAdditions — adições ligadas viram card', () => {
  it('devolve a adição escolhida com category da option', () => {
    const cards = getChosenAdditions(clazz, 20, { druid_wild_companion: 'companheiro_animal' })
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ name: 'Companheiro Animal', category: 'magia' })
  })
  it('substituições NÃO entram aqui (são tratadas por resolveChosenFeature)', () => {
    const cards = getChosenAdditions(clazz, 20, { ranger_deft_explorer: 'habil' })
    expect(cards).toHaveLength(0)
  })
  it('adição não-escolhida não vira card', () => {
    expect(getChosenAdditions(clazz, 20, {})).toHaveLength(0)
  })
})
