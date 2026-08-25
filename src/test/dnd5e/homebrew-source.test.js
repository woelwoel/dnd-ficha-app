import { describe, it, expect } from 'vitest'
import { SOURCES, filterCatalogBySources } from '../../systems/dnd5e/domain/sources'

describe('fonte homebrew (conteúdo de terceiros)', () => {
  it('está registrada com rótulo e abreviação próprios', () => {
    expect(SOURCES.homebrew).toEqual({
      code: 'homebrew',
      label: 'Conteúdo de Terceiros',
      abbr: '3P',
    })
  })

  it('só oferece o item de terceiros quando a fonte está ligada', () => {
    const catalogo = [
      { index: 'guerreiro', source: 'phb' },
      { index: 'cacador-de-sangue', source: 'homebrew' },
    ]
    expect(filterCatalogBySources(catalogo, []).map(c => c.index))
      .toEqual(['guerreiro'])
    expect(filterCatalogBySources(catalogo, ['homebrew']).map(c => c.index))
      .toEqual(['guerreiro', 'cacador-de-sangue'])
  })
})
