import { describe, it, expect } from 'vitest'
import {
  isASIChoiceComplete, isChoiceDone, getLeveledChoices,
  computeBonusCantripsNeeded, getASILevels, getProgressionLevels,
  currentAttributesForASI,
} from '../systems/dnd5e/components/CharacterWizardV2/blocks/class-helpers'

describe('currentAttributesForASI', () => {
  it('soma base + bônus racial', () => {
    const draft = { baseAttributes: { str: 15, con: 13 }, racialBonuses: { str: 2, con: 1 } }
    const r = currentAttributesForASI(draft, 4)
    expect(r.str).toBe(17)
    expect(r.con).toBe(14)
  })

  it('inclui ASIs de OUTROS níveis, exclui o do nível pedido', () => {
    const draft = {
      baseAttributes: { str: 15 }, racialBonuses: { str: 2 },
      asiChoices: {
        4: { type: 'asi', bonuses: { str: 2 } },   // outro nível → conta
        8: { type: 'asi', bonuses: { str: 2 } },    // nível pedido → exclui
      },
    }
    // base 15 + racial 2 + ASI nv4 (2) = 19, excluindo o nv8
    expect(currentAttributesForASI(draft, 8).str).toBe(19)
  })

  it('inclui bônus de atributo de talento', () => {
    const draft = {
      baseAttributes: { dex: 14 }, racialBonuses: {},
      asiChoices: { 4: { type: 'feat', featAttrBonus: { amount: 1, choices: ['dex'] }, featChosenAttr: 'dex' } },
    }
    expect(currentAttributesForASI(draft, 8).dex).toBe(15)
  })
})

describe('isASIChoiceComplete', () => {
  it('false sem choice', () => expect(isASIChoiceComplete(null)).toBe(false))
  it('asi: true se total = 2', () => {
    expect(isASIChoiceComplete({ type: 'asi', bonuses: { str: 2 } })).toBe(true)
    expect(isASIChoiceComplete({ type: 'asi', bonuses: { str: 1, dex: 1 } })).toBe(true)
  })
  it('asi: false se total < 2', () => {
    expect(isASIChoiceComplete({ type: 'asi', bonuses: { str: 1 } })).toBe(false)
    expect(isASIChoiceComplete({ type: 'asi', bonuses: {} })).toBe(false)
  })
  it('feat: false sem featIndex', () => {
    expect(isASIChoiceComplete({ type: 'feat' })).toBe(false)
  })
  it('feat: true com featIndex e sem bonus secundário', () => {
    expect(isASIChoiceComplete({ type: 'feat', featIndex: 'tough' })).toBe(true)
  })
  it('feat: false com attrBonus de múltiplas escolhas mas sem featChosenAttr', () => {
    expect(isASIChoiceComplete({
      type: 'feat', featIndex: 'lucky',
      featAttrBonus: { amount: 1, choices: ['str', 'dex'] },
    })).toBe(false)
  })
  it('feat: true com featChosenAttr definido', () => {
    expect(isASIChoiceComplete({
      type: 'feat', featIndex: 'lucky',
      featAttrBonus: { amount: 1, choices: ['str', 'dex'] },
      featChosenAttr: 'str',
    })).toBe(true)
  })
})

describe('isChoiceDone', () => {
  it('single choice sem valor: false', () => {
    expect(isChoiceDone({ id: 'x' }, undefined)).toBe(false)
    expect(isChoiceDone({ id: 'x' }, '')).toBe(false)
  })
  it('single choice com valor: true', () => {
    expect(isChoiceDone({ id: 'x' }, 'option-a')).toBe(true)
  })
  it('multi choice abaixo do limite: false', () => {
    expect(isChoiceDone({ id: 'x', multiSelect: 2 }, ['a'])).toBe(false)
  })
  it('multi choice no limite: true', () => {
    expect(isChoiceDone({ id: 'x', multiSelect: 2 }, ['a', 'b'])).toBe(true)
  })
})

describe('getLeveledChoices', () => {
  it('filtra até o nível e ordena por level', () => {
    const data = { choices: [
      { id: 'a', level: 5 },
      { id: 'b', level: 1 },
      { id: 'c', level: 3 },
      { id: 'd', level: 7 },
    ]}
    const r = getLeveledChoices(data, 5)
    expect(r.map(c => c.id)).toEqual(['b', 'c', 'a'])
  })
  it('retorna [] se data null', () => {
    expect(getLeveledChoices(null, 10)).toEqual([])
  })
})

describe('computeBonusCantripsNeeded', () => {
  const choices = [
    { id: 'pact', level: 3, options: [
      { value: 'tome', grants: { bonusCantrips: 3 } },
      { value: 'blade', grants: {} },
    ]},
    { id: 'multi', level: 1, multiSelect: 2, options: [
      { value: 'a', grants: { bonusCantrips: 1 } },
      { value: 'b', grants: { bonusCantrips: 1 } },
      { value: 'c', grants: {} },
    ]},
  ]

  it('zero quando nada escolhido', () => {
    expect(computeBonusCantripsNeeded(choices, {})).toBe(0)
  })
  it('soma single grant', () => {
    expect(computeBonusCantripsNeeded(choices, { pact: 'tome' })).toBe(3)
  })
  it('soma multi grants', () => {
    expect(computeBonusCantripsNeeded(choices, { multi: ['a', 'b'] })).toBe(2)
  })
  it('combinação', () => {
    expect(computeBonusCantripsNeeded(choices, { pact: 'tome', multi: ['a', 'c'] })).toBe(4)
  })
})

describe('getASILevels', () => {
  it('lista níveis com feature "Aumento de Atributo" até level', () => {
    const data = { levels: [
      { level: 1, features: [{ name: 'X' }] },
      { level: 4, features: [{ name: 'Aumento de Atributo' }] },
      { level: 8, features: [{ name: 'Aumento de Atributo' }] },
      { level: 12, features: [{ name: 'Aumento de Atributo' }] },
    ]}
    expect(getASILevels(data, 5)).toEqual([4])
    expect(getASILevels(data, 8)).toEqual([4, 8])
  })
  it('[] se data null', () => expect(getASILevels(null, 10)).toEqual([]))
})

describe('getProgressionLevels', () => {
  it('filtra até level e ordena', () => {
    const data = { levels: [
      { level: 3, features: [] },
      { level: 1, features: [] },
      { level: 5, features: [] },
    ]}
    const r = getProgressionLevels(data, 3)
    expect(r.map(l => l.level)).toEqual([1, 3])
  })
  it('[] se data null', () => expect(getProgressionLevels(null, 5)).toEqual([]))
})
