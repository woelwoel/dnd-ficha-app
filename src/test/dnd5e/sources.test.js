import { describe, it, expect } from 'vitest'
import { SOURCES, sourceOf, tagSource } from '../../systems/dnd5e/domain/sources'

describe('sources — procedência', () => {
  it('PHB e Tasha existem com metadados de exibição', () => {
    expect(SOURCES.phb.label).toBeTruthy()
    expect(SOURCES.tasha.label).toMatch(/Tasha/i)
    expect(SOURCES.tasha.abbr).toBe('TCE')
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
