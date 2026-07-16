import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { enrichWithFeatSpells } from '../../systems/dnd5e/domain/featSpells'
import { applyLevelUp } from '../../systems/dnd5e/domain/rules'

const allSpells = [
  ...JSON.parse(readFileSync('public/srd-data/phb-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/tasha-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/xanathar-spells-pt.json', 'utf8')),
]

const FEY = {
  index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas',
  attrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 },
}

function makeChar(overrides = {}) {
  return {
    id: 'c1',
    meta: { settings: { allowFeats: true }, ...overrides.meta },
    info: {
      name: 'Heitor', class: 'guerreiro', level: 3,
      multiclasses: [], feats: [], asiOrFeatByLevel: {},
      ...overrides.info,
    },
    attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 13 },
    combat: { maxHp: 30, currentHp: 30, tempHp: 0, armorClass: 14, speed: 30 },
    proficiencies: {},
    spellcasting: { spells: [], ...overrides.spellcasting },
    inventory: { currency: {} },
    traits: {},
  }
}

function feyPatch(extra = {}) {
  return {
    newLevel: 4, hpIncrease: 6, attrBoosts: {},
    chosenFeat: FEY, featChosenAttr: 'cha',
    featSpellChoices: { list: null, picks: [['enfeiticar-pessoa']] },
    ...extra,
  }
}

describe('enrichWithFeatSpells + applyLevelUp', () => {
  it('injeta fixa + escolhida com ability e persiste spellChoices no feat', () => {
    const c = makeChar()
    const next = applyLevelUp(c, enrichWithFeatSpells({ patch: feyPatch(), character: c, srdSpells: allSpells }))
    const byIdx = Object.fromEntries(next.spellcasting.spells.map(s => [s.index, s]))
    expect(byIdx['passo-nebuloso'].featGrants).toEqual([{ featIndex: 'tocado-pelas-fadas', featGrant: 0 }])
    expect(byIdx['enfeiticar-pessoa'].featGrants).toEqual([{ featIndex: 'tocado-pelas-fadas', featGrant: 1 }])
    expect(byIdx['passo-nebuloso'].ability).toBe('cha')
    expect(byIdx['enfeiticar-pessoa'].ability).toBe('cha')
    expect(next.info.feats[0].spellChoices).toEqual({ list: null, picks: [['enfeiticar-pessoa']] })
  })

  it('MERGE: magia já conhecida ganha proveniência sem duplicar, e SEM carimbar ability', () => {
    const c = makeChar({ spellcasting: { spells: [
      { index: 'passo-nebuloso', name: 'Passo Nebuloso', level: 2, source: 'oath' },
    ] } })
    const next = applyLevelUp(c, enrichWithFeatSpells({ patch: feyPatch(), character: c, srdSpells: allSpells }))
    const matches = next.spellcasting.spells.filter(s => s.index === 'passo-nebuloso')
    expect(matches).toHaveLength(1)
    expect(matches[0].featGrants).toEqual([{ featIndex: 'tocado-pelas-fadas', featGrant: 0 }])
    expect(matches[0].ability).toBeUndefined()   // já era do juramento — não carimba
    expect(matches[0].source).toBe('oath')       // não sobrescreve
  })

  it('MERGE acumula quando a magia já tem featGrants de OUTRO talento', () => {
    const c = makeChar({
      info: { feats: [{ index: 'teleporte-das-fadas', name: 'Teleporte das Fadas', takenAtLevel: 1, chosenAttr: 'int' }] },
      spellcasting: { spells: [
        { index: 'passo-nebuloso', name: 'Passo Nebuloso', level: 2, source: 'feat',
          ability: 'int', featGrants: [{ featIndex: 'teleporte-das-fadas', featGrant: 0 }] },
      ] },
    })
    const next = applyLevelUp(c, enrichWithFeatSpells({ patch: feyPatch(), character: c, srdSpells: allSpells }))
    const pn = next.spellcasting.spells.find(s => s.index === 'passo-nebuloso')
    expect(pn.featGrants).toEqual([
      { featIndex: 'teleporte-das-fadas', featGrant: 0 },
      { featIndex: 'tocado-pelas-fadas', featGrant: 0 },
    ])
    expect(pn.ability).toBe('int')  // preservado
  })

  it('allowFeats false → patch intacto, nada injetado', () => {
    const c = makeChar({ meta: { settings: { allowFeats: false } } })
    const patch = feyPatch()
    expect(enrichWithFeatSpells({ patch, character: c, srdSpells: allSpells })).toBe(patch)
  })

  it('ASI junto do feat → patch intacto (ASI vence, espelha applyLevelUp)', () => {
    const c = makeChar()
    const patch = feyPatch({ attrBoosts: { str: 2 } })
    expect(enrichWithFeatSpells({ patch, character: c, srdSpells: allSpells })).toBe(patch)
  })

  it('level-up de MULTICLASSE também injeta (diferente do enrich de subclasse)', () => {
    const c = makeChar({ info: { class: 'guerreiro', level: 5, multiclasses: [{ class: 'mago', level: 3 }] } })
    const patch = feyPatch({ multiclassIndex: 0, featChosenAttr: 'int' })
    const next = applyLevelUp(c, enrichWithFeatSpells({ patch, character: c, srdSpells: allSpells }))
    const sp = next.spellcasting.spells.find(s => s.index === 'passo-nebuloso')
    expect(sp).toBeTruthy()
    expect(sp.ability).toBe('int')
  })

  it('patch sem chosenFeat → intacto', () => {
    const c = makeChar()
    const patch = { newLevel: 4, hpIncrease: 6, attrBoosts: { str: 2 } }
    expect(enrichWithFeatSpells({ patch, character: c, srdSpells: allSpells })).toBe(patch)
  })

  it('talento sem magia (Robusto) → patch intacto', () => {
    const c = makeChar()
    const patch = feyPatch({ chosenFeat: { index: 'robusto', name: 'Robusto' }, featSpellChoices: null })
    expect(enrichWithFeatSpells({ patch, character: c, srdSpells: allSpells })).toBe(patch)
  })

  it('preserva bonusSpells que já vieram do enrich de subclasse', () => {
    const c = makeChar()
    const patch = feyPatch({ bonusSpells: [{ index: 'raio-guiador', name: 'Raio Guiador', level: 1, source: 'domain' }] })
    const out = enrichWithFeatSpells({ patch, character: c, srdSpells: allSpells })
    expect(out.bonusSpells.map(s => s.index)).toEqual(['raio-guiador', 'passo-nebuloso', 'enfeiticar-pessoa'])
  })

  it('magia já staged em bonusSpells pelo enrich de subclasse: merge, não duplica', () => {
    // O enrich de subclasse roda ANTES e pode ter posto a mesma magia em
    // bonusSpells. Sem enxergar isso, a ref do talento se perderia no
    // uniqueBy (first-wins) do applyLevelUp.
    const c = makeChar()
    const staged = { index: 'passo-nebuloso', name: 'Passo Nebuloso', level: 2, source: 'oath' }
    const patch = feyPatch({ bonusSpells: [staged] })
    const out = enrichWithFeatSpells({ patch, character: c, srdSpells: allSpells })
    // não empurra passo-nebuloso de novo
    expect(out.bonusSpells.filter(s => s.index === 'passo-nebuloso')).toHaveLength(1)
    // e a proveniência vai pelo merge
    expect(out.featSpellMerges).toEqual([
      { index: 'passo-nebuloso', featGrants: [{ featIndex: 'tocado-pelas-fadas', featGrant: 0 }] },
    ])
    // ponta a ponta: applyLevelUp aplica o merge sobre a cópia sobrevivente
    const next = applyLevelUp(c, out)
    const pn = next.spellcasting.spells.filter(s => s.index === 'passo-nebuloso')
    expect(pn).toHaveLength(1)
    expect(pn[0].featGrants).toEqual([{ featIndex: 'tocado-pelas-fadas', featGrant: 0 }])
    expect(pn[0].source).toBe('oath')
  })
})
