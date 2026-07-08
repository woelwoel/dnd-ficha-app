import { describe, it, expect } from 'vitest'
import { SOURCES, sourceOf, tagSource, filterCatalogBySources } from '../../systems/dnd5e/domain/sources'

describe('sources — procedência', () => {
  it('PHB e Tasha existem com metadados de exibição', () => {
    expect(SOURCES.phb.label).toBeTruthy()
    expect(SOURCES.tasha.label).toMatch(/Tasha/i)
    expect(SOURCES.tasha.abbr).toBe('TCE')
  })

  it('conhece a fonte xanathar (XGE)', () => {
    expect(SOURCES.xanathar).toMatchObject({
      code: 'xanathar',
      label: 'Guia de Xanathar para Todas as Coisas',
      abbr: 'XGE',
    })
  })

  it('sourceOf cai em phb quando o item não declara source', () => {
    expect(sourceOf({ index: 'x' })).toBe('phb')
    expect(sourceOf({ index: 'x', source: 'tasha' })).toBe('tasha')
  })

  it('tagSource carimba todos os itens sem mutar o original', () => {
    const input = [{ index: 'a' }]
    const out = tagSource(input, 'tasha')
    expect(out[0].source).toBe('tasha')
    expect(input[0].source).toBeUndefined()
  })
})

describe('filterCatalogBySources — oferta', () => {
  const catalogo = [
    { index: 'phb-feat' },                       // sem source = phb
    { index: 'tasha-feat', source: 'tasha' },
  ]

  it('só phb: oferta esconde itens de Tasha', () => {
    const out = filterCatalogBySources(catalogo, ['phb'])
    expect(out.map(i => i.index)).toEqual(['phb-feat'])
  })

  it('phb+tasha: oferta inclui ambos', () => {
    const out = filterCatalogBySources(catalogo, ['phb', 'tasha'])
    expect(out.map(i => i.index)).toEqual(['phb-feat', 'tasha-feat'])
  })

  it('sources ausente/vazio cai em só phb (fichas legadas)', () => {
    expect(filterCatalogBySources(catalogo, undefined).map(i => i.index)).toEqual(['phb-feat'])
    expect(filterCatalogBySources(catalogo, []).map(i => i.index)).toEqual(['phb-feat'])
  })

  it('gating trata item xanathar como qualquer suplemento', () => {
    const items = [{ index: 'a' }, { index: 'b', source: 'xanathar' }]
    expect(filterCatalogBySources(items, ['phb']).map(i => i.index)).toEqual(['a'])
    expect(filterCatalogBySources(items, ['phb', 'xanathar']).map(i => i.index)).toEqual(['a', 'b'])
  })
})
