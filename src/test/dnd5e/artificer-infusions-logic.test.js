import { describe, it, expect } from 'vitest'
import { availableInfusions, pruneOrphanActive } from '../../systems/dnd5e/domain/artificerInfusions'

const catalog = [
  { index: 'a', name: 'A', prereq: 2, source: 'tasha' },
  { index: 'b', name: 'B', prereq: 6, source: 'tasha' },
  { index: 'phb-x', name: 'X', prereq: 2, source: 'phb' },
]

describe('availableInfusions', () => {
  it('filtra por nível e por fonte ativa', () => {
    // nv5, fonte tasha: 'a' (prereq2) sim, 'b' (prereq6) não, phb-x sim (phb sempre)
    expect(availableInfusions(catalog, 5, ['phb', 'tasha']).map(i => i.index)).toEqual(['a', 'phb-x'])
  })
  it('sem tasha: some infusão tasha', () => {
    expect(availableInfusions(catalog, 20, ['phb']).map(i => i.index)).toEqual(['phb-x'])
  })
})

describe('pruneOrphanActive', () => {
  it('remove ativas cujo item não existe mais', () => {
    const active = [{ infusion: 'a', itemId: 'i1' }, { infusion: 'b', itemId: 'gone' }]
    expect(pruneOrphanActive(active, ['i1'])).toEqual([{ infusion: 'a', itemId: 'i1' }])
  })
})
