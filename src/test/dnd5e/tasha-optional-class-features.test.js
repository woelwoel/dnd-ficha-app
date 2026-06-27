import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { mergeClassChoices } from '../../systems/dnd5e/domain/mergeClassChoices'
import { isOptionalChoice, isAdditionChoice } from '../../systems/dnd5e/domain/optionalFeatures'

const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'))
const phb = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-class-choices-pt.json'), 'utf-8'))
const prog = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-class-progression-pt.json'), 'utf-8'))

function choice(cls, id) {
  return tasha[cls]?.choices.find(c => c.id === id)
}
function baseFeatureNames(cls) {
  return (prog[cls]?.levels ?? []).flatMap(l => (l.features ?? []).map(f => f.name))
}

describe('Patrulheiro — substituições opcionais (Hábil, Inimigo Eleito)', () => {
  const CASOS = [
    { id: 'ranger_deft_explorer', featureName: 'Explorador Natural', value: 'habil', level: 1 },
    { id: 'ranger_favored_enemy_opt', featureName: 'Inimigo Favorito', value: 'inimigo_eleito', level: 1 },
  ]
  for (const { id, featureName, value, level } of CASOS) {
    it(`${id}: optional, com featureName que casa a feature-base e nível ${level}`, () => {
      const c = choice('patrulheiro', id)
      expect(c, `${id} ausente`).toBeTruthy()
      expect(isOptionalChoice(c)).toBe(true)
      expect(isAdditionChoice(c)).toBe(false)
      expect(c.featureName).toBe(featureName)
      expect(c.level).toBe(level)
      expect(c.options.map(o => o.value)).toEqual([value])
      expect(c.options[0].desc.length).toBeGreaterThan(60)
      expect(baseFeatureNames('patrulheiro')).toContain(featureName)
    })
  }
})

describe('Druida — adição opcional (Companheiro Animal)', () => {
  it('druid_wild_companion: optional + addsFeature, sem featureName, nível 2', () => {
    const c = choice('druida', 'druid_wild_companion')
    expect(c, 'druid_wild_companion ausente').toBeTruthy()
    expect(isAdditionChoice(c)).toBe(true)
    expect(c.featureName).toBeUndefined()
    expect(c.level).toBe(2)
    expect(c.options.map(o => o.value)).toEqual(['companheiro_animal'])
    expect(c.options[0].category).toBe('magia')
  })
})

describe('options das opcionais NÃO gravam source no cru; merge carimba tasha', () => {
  it('cru sem source; mesclado com source tasha', () => {
    for (const id of ['ranger_deft_explorer', 'ranger_favored_enemy_opt']) {
      for (const o of choice('patrulheiro', id).options) expect(o.source).toBeUndefined()
    }
    const merged = mergeClassChoices(phb, tasha, 'tasha')
    const c = merged.patrulheiro.choices.find(x => x.id === 'ranger_deft_explorer')
    expect(c.options.every(o => o.source === 'tasha')).toBe(true)
  })
})
