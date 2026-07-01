import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { defaultClassFeatureUses } from '../../systems/dnd5e/domain/rules'

const read = f => JSON.parse(fs.readFileSync(path.resolve('public/srd-data', f), 'utf-8'))
const classChoices = { ...read('phb-class-choices-pt.json') }
// merge tasha (mesma união do app é suficiente p/ teste: só precisamos da chave bruxo)
Object.assign(classChoices, (() => {
  const t = read('tasha-class-choices-pt.json'); const out = { ...classChoices }
  for (const k of Object.keys(t)) {
    if (!out[k]) { out[k] = t[k]; continue }
    out[k] = { ...out[k], choices: [...out[k].choices] }
    for (const ech of t[k].choices) {
      const ex = out[k].choices.find(c => c.id === ech.id)
      if (ex) ex.options = [...ex.options, ...ech.options]; else out[k].choices.push(ech)
    }
  }
  return out
})())

describe('defaultClassFeatureUses + subclasse', () => {
  it('SEM classChoices: comportamento atual (nenhum tracker de subclasse)', () => {
    const char = { info: { class: 'bruxo', level: 6, chosenFeatures: { patron: 'insondavel' } }, attributes: { cha: 16 } }
    const uses = defaultClassFeatureUses(char)
    expect(uses.some(u => u.id.startsWith('bruxo-sub-insondavel'))).toBe(false)
  })

  it('COM classChoices: Bruxo Insondável nv6 ganha tracker do Tentáculo (prof usos)', () => {
    const char = { info: { class: 'bruxo', level: 6, chosenFeatures: { patron: 'insondavel' } }, attributes: { cha: 16 } }
    const uses = defaultClassFeatureUses(char, classChoices)
    const tentacle = uses.find(u => u.id.startsWith('bruxo-sub-insondavel-1'))
    expect(tentacle).toBeTruthy()
    expect(tentacle.max).toBe(3)        // prof nv6 = +3
    expect(tentacle.recharge).toBeDefined()
  })

  it('COM classChoices: Mago Evocador não ganha tracker fantasma', () => {
    const char = { info: { class: 'mago', level: 10, chosenFeatures: { arcane_tradition: 'evocacao' } }, attributes: { int: 16 } }
    const uses = defaultClassFeatureUses(char, classChoices)
    expect(uses.some(u => u.id.startsWith('mago-sub-evocacao'))).toBe(false)
  })
})
