import { describe, it, expect } from 'vitest'
import { filterCatalogBySources } from '../../systems/dnd5e/domain/sources'

describe('gating da lista de classes (contrato de oferta)', () => {
  const classes = [{ index: 'druida', source: 'phb' }, { index: 'artifice', source: 'tasha' }]

  it('só phb não oferece Artífice', () => {
    expect(filterCatalogBySources(classes, ['phb']).map(c => c.index)).toEqual(['druida'])
  })

  it('com tasha oferece Artífice', () => {
    expect(filterCatalogBySources(classes, ['phb', 'tasha']).map(c => c.index)).toEqual(['druida', 'artifice'])
  })

  it('sources ausente cai em só phb', () => {
    expect(filterCatalogBySources(classes, undefined).map(c => c.index)).toEqual(['druida'])
  })
})
