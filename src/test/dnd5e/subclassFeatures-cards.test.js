// src/test/dnd5e/subclassFeatures-cards.test.js
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { getSubclassFeatureCards, SUBCLASS_CHOICE_IDS } from '../../systems/dnd5e/domain/subclassFeatures'

const read = f => JSON.parse(fs.readFileSync(path.resolve('public/srd-data', f), 'utf-8'))
const phb = read('phb-class-choices-pt.json')

describe('getSubclassFeatureCards', () => {
  it('expõe o conjunto de ids de choices de subclasse', () => {
    expect(SUBCLASS_CHOICE_IDS.has('arcane_tradition')).toBe(true)
    expect(SUBCLASS_CHOICE_IDS.has('patron')).toBe(true)
  })

  it('Mago Evocador nv5: mostra features de nv ≤5, esconde nv6+', () => {
    const cards = getSubclassFeatureCards({
      classIndex: 'mago',
      chosenFeatures: { arcane_tradition: 'evocacao' },
      classChoices: phb,
      level: 5,
      classLabel: 'Mago',
    })
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.every(c => c.level <= 5)).toBe(true)
    expect(cards.some(c => c.level === 6)).toBe(false)
    // id estável e único
    const ids = cards.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids[0]).toMatch(/^mago-sub-evocacao-/)
    // source legível
    expect(cards[0].source).toBe('Mago · Evocação')
  })

  it('sem subclasse escolhida: nenhum card', () => {
    expect(getSubclassFeatureCards({
      classIndex: 'mago', chosenFeatures: {}, classChoices: phb, level: 10, classLabel: 'Mago',
    })).toEqual([])
  })

  it('fallback de nome usa "<rótulo da opção> (Nv N)" quando bullet é denso', () => {
    const tasha = read('tasha-class-choices-pt.json')
    const cards = getSubclassFeatureCards({
      classIndex: 'bruxo', chosenFeatures: { patron: 'insondavel' },
      classChoices: tasha, level: 1, classLabel: 'Bruxo',
    })
    expect(cards.length).toBeGreaterThan(0)
    expect(cards[0].name).toMatch(/\(Nv 1\)/)
  })
})
