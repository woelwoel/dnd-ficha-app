import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { getSubclassSpellsForLevel } from '../../systems/dnd5e/domain/subclassSpells'
import { getClericDomainSpellIndices } from '../../systems/dnd5e/domain/rules'

const catalog = new Set(
  ['phb', 'tasha', 'xanathar']
    .flatMap(s => JSON.parse(readFileSync(`public/srd-data/${s}-spells-pt.json`, 'utf8')))
    .map(sp => sp.index)
)

describe('lista expandida do Hexblade', () => {
  it('concede magias nos tiers de bruxo (nv 1/3/5/7/9)', () => {
    const r1 = getSubclassSpellsForLevel({ classIndex: 'bruxo', chosenFeatures: { patron: 'hexblade' }, classLevel: 1 })
    expect(r1.indices.length).toBeGreaterThanOrEqual(2)
    expect(r1.alwaysPrepared).toBe(true)
    expect(r1.source).toBe('patron')
  })

  it('todos os slugs referenciados existem no catálogo composto', () => {
    for (const lvl of [1, 3, 5, 7, 9]) {
      const r = getSubclassSpellsForLevel({ classIndex: 'bruxo', chosenFeatures: { patron: 'hexblade' }, classLevel: lvl })
      for (const idx of r.indices) expect(catalog.has(idx), idx).toBe(true)
    }
  })
})

describe('domínios XGE do clérigo', () => {
  it.each([['forja'], ['sepultura']])('%s concede 2 magias/tier em 1/3/5/7/9', (domain) => {
    for (const lvl of [1, 3, 5, 7, 9]) {
      const idx = getClericDomainSpellIndices(domain, lvl)
      expect(idx.length, `${domain} nv${lvl}`).toBe(2)
      for (const s of idx) expect(catalog.has(s), s).toBe(true)
    }
  })
})
