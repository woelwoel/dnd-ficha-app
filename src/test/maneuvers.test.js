import { describe, it, expect } from 'vitest'
import { defaultClassFeatureUses } from '../systems/dnd5e/domain/rules'
import { resolveMultiSelect, isChoiceDone } from '../components/CharacterWizardV2/blocks/class-helpers'

function fighterChar(level, chosenArchetype = null) {
  return {
    info: {
      class: 'guerreiro',
      level,
      chosenFeatures: chosenArchetype ? { martial_archetype: chosenArchetype } : {},
    },
    attributes: { str: 14, dex: 12, con: 13, int: 10, wis: 10, cha: 10 },
  }
}

describe('Dado de Superioridade (Mestre de Combate)', () => {
  it('não aparece pra Guerreiro sem arquétipo escolhido', () => {
    const uses = defaultClassFeatureUses(fighterChar(3))
    expect(uses.find(u => u.id === 'guerreiro-superiority-dice')).toBeUndefined()
  })

  it('não aparece pra Campeão', () => {
    const uses = defaultClassFeatureUses(fighterChar(3, 'campeao'))
    expect(uses.find(u => u.id === 'guerreiro-superiority-dice')).toBeUndefined()
  })

  it('aparece pra Mestre de Combate nv 3 — 4 dados d8', () => {
    const uses = defaultClassFeatureUses(fighterChar(3, 'mestre_combate'))
    const sup = uses.find(u => u.id === 'guerreiro-superiority-dice')
    expect(sup).toBeDefined()
    expect(sup.max).toBe(4)
    expect(sup.name).toContain('d8')
    expect(sup.recharge).toBe('short')
  })

  it('5 dados no nv 7', () => {
    const sup = defaultClassFeatureUses(fighterChar(7, 'mestre_combate'))
      .find(u => u.id === 'guerreiro-superiority-dice')
    expect(sup.max).toBe(5)
    expect(sup.name).toContain('d8')
  })

  it('d10 no nv 10', () => {
    const sup = defaultClassFeatureUses(fighterChar(10, 'mestre_combate'))
      .find(u => u.id === 'guerreiro-superiority-dice')
    expect(sup.max).toBe(5)
    expect(sup.name).toContain('d10')
  })

  it('6 dados d10 no nv 15', () => {
    const sup = defaultClassFeatureUses(fighterChar(15, 'mestre_combate'))
      .find(u => u.id === 'guerreiro-superiority-dice')
    expect(sup.max).toBe(6)
    expect(sup.name).toContain('d10')
  })

  it('6 dados d12 no nv 18', () => {
    const sup = defaultClassFeatureUses(fighterChar(18, 'mestre_combate'))
      .find(u => u.id === 'guerreiro-superiority-dice')
    expect(sup.max).toBe(6)
    expect(sup.name).toContain('d12')
  })
})

describe('resolveMultiSelect (multiSelectByLevel)', () => {
  const maneuversChoice = {
    multiSelectByLevel: { 3: 3, 7: 5, 10: 7, 15: 9 },
  }

  it('escala com nível', () => {
    expect(resolveMultiSelect(maneuversChoice, 3)).toBe(3)
    expect(resolveMultiSelect(maneuversChoice, 6)).toBe(3)
    expect(resolveMultiSelect(maneuversChoice, 7)).toBe(5)
    expect(resolveMultiSelect(maneuversChoice, 10)).toBe(7)
    expect(resolveMultiSelect(maneuversChoice, 20)).toBe(9)
  })

  it('multiSelect fixo tem precedência sobre byLevel', () => {
    expect(resolveMultiSelect({ multiSelect: 2, multiSelectByLevel: { 3: 5 } }, 3)).toBe(2)
  })

  it('0 quando ausente', () => {
    expect(resolveMultiSelect({}, 5)).toBe(0)
    expect(resolveMultiSelect(null, 5)).toBe(0)
  })

  it('isChoiceDone usa byLevel corretamente', () => {
    expect(isChoiceDone(maneuversChoice, ['a', 'b'], 3)).toBe(false)       // precisa 3
    expect(isChoiceDone(maneuversChoice, ['a', 'b', 'c'], 3)).toBe(true)
    expect(isChoiceDone(maneuversChoice, ['a', 'b', 'c'], 7)).toBe(false)  // precisa 5 no nv 7
    expect(isChoiceDone(maneuversChoice, ['a', 'b', 'c', 'd', 'e'], 7)).toBe(true)
  })
})
