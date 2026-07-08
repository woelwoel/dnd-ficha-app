import { describe, it, expect } from 'vitest'
import { filterCatalogBySources } from '../../systems/dnd5e/domain/sources'

describe('gating de talentos por fonte (contrato de oferta)', () => {
  const feats = [
    { index: 'adepto-elemental', source: 'phb' },
    { index: 'esmagador', source: 'tasha' },
  ]
  it('ficha só phb não oferece talento de Tasha', () => {
    expect(filterCatalogBySources(feats, ['phb']).map(f => f.index)).toEqual(['adepto-elemental'])
  })
  it('ficha com tasha oferece os dois', () => {
    expect(filterCatalogBySources(feats, ['phb', 'tasha']).map(f => f.index))
      .toEqual(['adepto-elemental', 'esmagador'])
  })
  it('sources ausente cai em só phb', () => {
    expect(filterCatalogBySources(feats, undefined).map(f => f.index)).toEqual(['adepto-elemental'])
  })

  it('talento xanathar só é oferecido com a fonte xanathar ativa', () => {
    const racial = [...feats, { index: 'fortitude-ana', source: 'xanathar' }]
    expect(filterCatalogBySources(racial, ['phb']).map(f => f.index)).toEqual(['adepto-elemental'])
    expect(filterCatalogBySources(racial, ['phb', 'tasha']).map(f => f.index))
      .toEqual(['adepto-elemental', 'esmagador'])
    expect(filterCatalogBySources(racial, ['phb', 'xanathar']).map(f => f.index))
      .toEqual(['adepto-elemental', 'fortitude-ana'])
  })
})
