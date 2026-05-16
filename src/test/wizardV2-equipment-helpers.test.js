import { describe, it, expect } from 'vitest'
import {
  rollGoldFormula, allPicksDone, computePreviewItems,
} from '../components/CharacterWizardV2/blocks/class/equipment-helpers'

describe('rollGoldFormula', () => {
  it('5d4 × 10 retorna entre 50 e 200', () => {
    const v = rollGoldFormula('5d4 × 10')
    expect(v).toBeGreaterThanOrEqual(50)
    expect(v).toBeLessThanOrEqual(200)
  })
  it('fallback pra 5d4 × 10 se formula vazia', () => {
    const v = rollGoldFormula(null)
    expect(v).toBeGreaterThanOrEqual(50)
    expect(v).toBeLessThanOrEqual(200)
  })
})

const sampleData = {
  choices: [
    { id: 'weapon', prompt: 'Arma', options: [
      { value: 'longsword', label: 'Espada longa', items: [{ name: 'Espada longa', qty: 1 }] },
      { value: 'martial-choice', label: 'Qualquer marcial', items: [{ pick: 'martial', pickLabel: 'Arma marcial' }] },
    ]},
  ],
  fixed: [
    { name: 'Mochila', qty: 1 },
    { pick: 'simple', pickLabel: 'Arma simples extra', name: 'Arma simples' },
  ],
}

describe('allPicksDone', () => {
  it('true quando nada que precisa de pick', () => {
    expect(allPicksDone({ choices: [], fixed: [] }, {}, {})).toBe(true)
  })
  it('false sem nenhuma escolha feita', () => {
    expect(allPicksDone(sampleData, {}, {})).toBe(false)
  })
  it('false quando escolha precisa de pick e pick está vazio', () => {
    expect(allPicksDone(sampleData, { weapon: 'martial-choice' }, {})).toBe(false)
  })
  it('true quando todos picks resolvidos', () => {
    const picks = {
      'weapon:martial-choice:0': 'Machado',
      'fixed:Arma simples': 'Adaga',
    }
    expect(allPicksDone(sampleData, { weapon: 'martial-choice' }, picks)).toBe(true)
  })
  it('true sem classEquipmentData', () => {
    expect(allPicksDone(null, {}, {})).toBe(true)
  })
})

describe('computePreviewItems', () => {
  it('[] sem data', () => expect(computePreviewItems(null, {}, {})).toEqual([]))
  it('inclui itens fixos sem pick', () => {
    const r = computePreviewItems(sampleData, {}, {})
    expect(r).toContainEqual({ name: 'Mochila', qty: 1 })
  })
  it('inclui pick resolvido em choice', () => {
    const r = computePreviewItems(
      sampleData,
      { weapon: 'martial-choice' },
      { 'weapon:martial-choice:0': 'Machado' },
    )
    expect(r).toContainEqual({ name: 'Machado', qty: 1 })
  })
  it('inclui pick fixo resolvido', () => {
    const r = computePreviewItems(
      sampleData, {}, { 'fixed:Arma simples': 'Adaga' },
    )
    expect(r).toContainEqual({ name: 'Adaga', qty: 1 })
  })
  it('inclui itens não-pick da opção escolhida', () => {
    const r = computePreviewItems(sampleData, { weapon: 'longsword' }, {})
    expect(r).toContainEqual({ name: 'Espada longa', qty: 1 })
  })
})
