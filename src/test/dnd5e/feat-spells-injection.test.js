import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { injectFeatSpells } from '../../systems/dnd5e/domain/featSpells'
import { buildCharacter, buildCharacterWithSubclassSpells } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'
import { INITIAL_DRAFT_V2 } from '../../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'

const allSpells = [
  ...JSON.parse(readFileSync('public/srd-data/phb-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/tasha-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/xanathar-spells-pt.json', 'utf8')),
]

function makeChar(feats, spells = []) {
  return {
    info: { class: 'guerreiro', level: 4, multiclasses: [], feats },
    attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 13 },
    spellcasting: { spells },
  }
}

describe('injectFeatSpells', () => {
  it('talento só com fixas injeta com ability, label e proveniência', () => {
    const c = makeChar([{ index: 'telepatico', name: 'Telepático', takenAtLevel: 4, chosenAttr: 'wis' }])
    const next = injectFeatSpells(c, allSpells)
    const sp = next.spellcasting.spells.find(s => s.index === 'detectar-pensamentos')
    expect(sp).toBeTruthy()
    expect(sp.ability).toBe('wis')
    expect(sp.source).toBe('feat')
    expect(sp.sourceLabel).toBe('Talento: Telepático')
    expect(sp.featGrants).toEqual([{ featIndex: 'telepatico', featGrant: 0 }])
    expect(sp.alwaysPrepared).toBe(true)
  })

  it('fixa + escolhida (tocado-pelas-fadas com pick)', () => {
    const c = makeChar([{
      index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', takenAtLevel: 4,
      chosenAttr: 'cha', spellChoices: { list: null, picks: [['enfeiticar-pessoa']] },
    }])
    const next = injectFeatSpells(c, allSpells)
    const byIdx = Object.fromEntries(next.spellcasting.spells.map(s => [s.index, s]))
    expect(byIdx['passo-nebuloso'].featGrants).toEqual([{ featIndex: 'tocado-pelas-fadas', featGrant: 0 }])
    // a escolha vem do grant 1 (grantIdx ABSOLUTO — grant 0 é a fixa)
    expect(byIdx['enfeiticar-pessoa'].featGrants).toEqual([{ featIndex: 'tocado-pelas-fadas', featGrant: 1 }])
    expect(next.spellcasting.spells.every(s => s.ability === 'cha')).toBe(true)
  })

  it('sem picks → injeta só a fixa', () => {
    const c = makeChar([{ index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', takenAtLevel: 4, chosenAttr: 'cha' }])
    const next = injectFeatSpells(c, allSpells)
    expect(next.spellcasting.spells.map(s => s.index)).toEqual(['passo-nebuloso'])
  })

  it('MERGE: magia já existente ganha proveniência, sem duplicar', () => {
    const existing = { index: 'passo-nebuloso', name: 'Passo Nebuloso', level: 2, source: 'oath', sourceLabel: 'Juramento: vinganca', alwaysPrepared: true, prepared: true }
    const c = makeChar(
      [{ index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', takenAtLevel: 4, chosenAttr: 'cha' }],
      [existing],
    )
    const next = injectFeatSpells(c, allSpells)
    const matches = next.spellcasting.spells.filter(s => s.index === 'passo-nebuloso')
    expect(matches).toHaveLength(1)
    expect(matches[0].featGrants).toEqual([{ featIndex: 'tocado-pelas-fadas', featGrant: 0 }])
    expect(matches[0].ability).toBe('cha')
    expect(matches[0].sourceLabel).toBe('Juramento: vinganca') // não sobrescreve
  })

  it('MERGE não sobrescreve ability já existente', () => {
    const existing = { index: 'passo-nebuloso', name: 'Passo Nebuloso', level: 2, ability: 'int' }
    const c = makeChar(
      [{ index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', takenAtLevel: 4, chosenAttr: 'cha' }],
      [existing],
    )
    const next = injectFeatSpells(c, allSpells)
    expect(next.spellcasting.spells[0].ability).toBe('int')
  })

  it('DOIS talentos, mesma magia: featGrants ACUMULA (não sobrescreve)', () => {
    // Alto elfo com Tocado pelas Fadas + Teleporte das Fadas — os dois dão
    // Passo Nebuloso. É o caso que motivou featGrants virar lista.
    const c = makeChar([
      { index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', takenAtLevel: 4, chosenAttr: 'cha' },
      { index: 'teleporte-das-fadas', name: 'Teleporte das Fadas', takenAtLevel: 8, chosenAttr: 'int' },
    ])
    const next = injectFeatSpells(c, allSpells)
    const matches = next.spellcasting.spells.filter(s => s.index === 'passo-nebuloso')
    expect(matches).toHaveLength(1)
    expect(matches[0].featGrants).toEqual([
      { featIndex: 'tocado-pelas-fadas', featGrant: 0 },
      { featIndex: 'teleporte-das-fadas', featGrant: 0 },
    ])
    // ability: o primeiro que resolve vence (o segundo não sobrescreve)
    expect(matches[0].ability).toBe('cha')
  })

  it('idempotente: segunda passada não muda nada', () => {
    const c = makeChar([{ index: 'telepatico', name: 'Telepático', takenAtLevel: 4, chosenAttr: 'wis' }])
    const once = injectFeatSpells(c, allSpells)
    const twice = injectFeatSpells(once, allSpells)
    expect(twice).toBe(once) // referência idêntica = nenhum trabalho
  })

  it('idempotente com DOIS talentos: não duplica refs em featGrants', () => {
    const c = makeChar([
      { index: 'tocado-pelas-fadas', name: 'Tocado pelas Fadas', takenAtLevel: 4, chosenAttr: 'cha' },
      { index: 'teleporte-das-fadas', name: 'Teleporte das Fadas', takenAtLevel: 8, chosenAttr: 'int' },
    ])
    const once = injectFeatSpells(c, allSpells)
    const twice = injectFeatSpells(once, allSpells)
    expect(twice).toBe(once)
    expect(twice.spellcasting.spells.find(s => s.index === 'passo-nebuloso').featGrants).toHaveLength(2)
  })

  it('personagem sem talentos com magia → retorna o próprio objeto', () => {
    const c = makeChar([{ index: 'robusto', name: 'Robusto', takenAtLevel: 4 }])
    expect(injectFeatSpells(c, allSpells)).toBe(c)
  })

  it('sem srdSpells → retorna o próprio objeto', () => {
    const c = makeChar([{ index: 'telepatico', name: 'Telepático', takenAtLevel: 4, chosenAttr: 'wis' }])
    expect(injectFeatSpells(c, [])).toBe(c)
    expect(injectFeatSpells(c, null)).toBe(c)
  })
})

const guerreiro = { index: 'guerreiro', hit_die: 10, spellcasting_ability: '' }
const baseDraft = {
  ...INITIAL_DRAFT_V2,
  name: 'Heitor', class: 'guerreiro', level: 1,
  baseAttributes: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
  savingThrows: ['str', 'con'],
}

describe('build-character — spellChoices e injeção no wrapper', () => {
  it('racialFeat.featSpellChoices vira info.feats[].spellChoices', () => {
    const draft = {
      ...baseDraft,
      racialFeat: {
        featIndex: 'tocado-pelas-fadas', featName: 'Tocado pelas Fadas',
        featAttrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 },
        featChosenAttr: 'cha',
        featSpellChoices: { list: null, picks: [['enfeiticar-pessoa']] },
      },
    }
    const c = buildCharacter(draft, guerreiro, {})
    expect(c.info.feats[0].spellChoices).toEqual({ list: null, picks: [['enfeiticar-pessoa']] })
  })

  it('asiChoices[lvl].featSpellChoices vira spellChoices do feat de nível', () => {
    const draft = {
      ...baseDraft, level: 4,
      asiChoices: { 4: {
        type: 'feat', featIndex: 'telepatico', featName: 'Telepático',
        featAttrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 }, featChosenAttr: 'wis',
        featSpellChoices: { list: null, picks: [] },
      } },
    }
    const c = buildCharacter(draft, guerreiro, {})
    const feat = c.info.feats.find(f => f.index === 'telepatico')
    expect(feat.spellChoices).toEqual({ list: null, picks: [] })
  })

  it('multiclasse: asiChoices da MC também carregam spellChoices', () => {
    const draft = {
      ...baseDraft, level: 4,
      multiclasses: [{ class: 'mago', level: 4, asiChoices: { 4: {
        type: 'feat', featIndex: 'telepatico', featName: 'Telepático',
        featAttrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 }, featChosenAttr: 'int',
        featSpellChoices: { list: null, picks: [] },
      } } }],
    }
    const c = buildCharacter(draft, guerreiro, {})
    const feat = c.info.feats.find(f => f.index === 'telepatico')
    expect(feat.spellChoices).toEqual({ list: null, picks: [] })
    expect(feat.fromClass).toBe('mago')
  })

  it('wrapper injeta magias de talento no build (Guerreiro + Telepático)', () => {
    const draft = {
      ...baseDraft,
      racialFeat: {
        featIndex: 'telepatico', featName: 'Telepático',
        featAttrBonus: { choices: ['int', 'wis', 'cha'], amount: 1 },
        featChosenAttr: 'wis',
      },
    }
    const c = buildCharacterWithSubclassSpells(draft, guerreiro, {}, allSpells)
    const sp = c.spellcasting.spells.find(s => s.index === 'detectar-pensamentos')
    expect(sp).toBeTruthy()
    expect(sp.ability).toBe('wis')
    expect(sp.featGrants).toEqual([{ featIndex: 'telepatico', featGrant: 0 }])
  })
})
