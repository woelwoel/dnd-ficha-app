import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { tagSource, filterCatalogBySources } from '../../systems/dnd5e/domain/sources'

const phb = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-magic-items-pt.json'), 'utf-8'))
const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-magic-items-pt.json'), 'utf-8'))

// Espelha a composição 'array' do SrdProvider.
const composed = [...tagSource(phb, 'phb'), ...tagSource(tasha, 'tasha')]

describe('catálogo de itens mágicos composto + gated', () => {
  it('tasha-magic-items é um array com o schema certo e sem source no cru', () => {
    expect(Array.isArray(tasha)).toBe(true)
    expect(tasha.length).toBeGreaterThanOrEqual(3)
    for (const it of tasha) {
      expect(typeof it.index).toBe('string')
      expect(typeof it.name).toBe('string')
      expect(it.rarity).toBeTruthy()
      expect(typeof it.description).toBe('string')
      expect(it.source).toBeUndefined()
    }
  })
  it('merge carimba phb e tasha; indices únicos', () => {
    const tashaIdx = new Set(tasha.map(i => i.index))
    const phbIdx = new Set(phb.map(i => i.index))
    for (const idx of tashaIdx) expect(phbIdx.has(idx)).toBe(false)
    expect(composed.find(i => i.index === 'amuleto-do-devoto').source).toBe('tasha')
    expect(composed.find(i => phb[0].index === i.index).source).toBe('phb')
  })
  it('sem Tasha ativo, itens de Tasha NÃO são oferecidos; com Tasha, sim', () => {
    const soPhb = filterCatalogBySources(composed, ['phb'])
    expect(soPhb.some(i => i.source === 'tasha')).toBe(false)
    expect(soPhb.length).toBe(phb.length)
    const comTasha = filterCatalogBySources(composed, ['phb', 'tasha'])
    expect(comTasha.some(i => i.index === 'amuleto-do-devoto')).toBe(true)
  })
})
