import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  FEAT_SPELL_GRANTS, getFeatSpellDef, resolveFeatAbility,
  isFeatSpellChoiceComplete,
} from '../../systems/dnd5e/domain/featSpells'

const allSpells = [
  ...JSON.parse(readFileSync('public/srd-data/phb-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/tasha-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/xanathar-spells-pt.json', 'utf8')),
]
const spellIdxSet = new Set(allSpells.map(s => s.index))

describe('FEAT_SPELL_GRANTS — sanidade das declarações', () => {
  it('cobre exatamente os 11 talentos da spec', () => {
    expect(Object.keys(FEAT_SPELL_GRANTS).sort()).toEqual([
      'alta-magia-drow', 'atirador-de-magia', 'conjurador-de-ritual',
      'iniciado-artifice', 'iniciado-em-magia', 'magia-do-elfo-da-floresta',
      'telecinetico', 'telepatico', 'teleporte-das-fadas',
      'tocado-pelas-fadas', 'tocado-pelas-sombras',
    ])
  })

  it('toda magia fixa declarada existe no catálogo', () => {
    for (const [feat, def] of Object.entries(FEAT_SPELL_GRANTS)) {
      for (const g of def.grants) {
        if (g.fixed) expect(spellIdxSet.has(g.fixed), `${feat}: ${g.fixed}`).toBe(true)
      }
    }
  })

  it('todo talento declarado existe nos catálogos de talentos', () => {
    const feats = [
      ...JSON.parse(readFileSync('public/srd-data/phb-feats-pt.json', 'utf8')),
      ...JSON.parse(readFileSync('public/srd-data/tasha-feats-pt.json', 'utf8')),
      ...JSON.parse(readFileSync('public/srd-data/xanathar-feats-pt.json', 'utf8')),
    ]
    const featIdxSet = new Set(feats.map(f => f.index))
    for (const key of Object.keys(FEAT_SPELL_GRANTS)) {
      expect(featIdxSet.has(key), key).toBe(true)
    }
  })

  it('getFeatSpellDef: null para talento sem magia', () => {
    expect(getFeatSpellDef('robusto')).toBeNull()
    expect(getFeatSpellDef('tocado-pelas-fadas')).not.toBeNull()
  })
})

describe('resolveFeatAbility', () => {
  it("'chosenAttr' usa o atributo aumentado pelo talento", () => {
    const def = getFeatSpellDef('tocado-pelas-fadas')
    expect(resolveFeatAbility(def, { chosenAttr: 'cha' })).toBe('cha')
  })

  it("'chosenAttr' sem escolha registrada → null", () => {
    const def = getFeatSpellDef('tocado-pelas-fadas')
    expect(resolveFeatAbility(def, {})).toBeNull()
  })

  it("'byList' mapeia mago→int, clerigo→wis, bardo→cha", () => {
    const def = getFeatSpellDef('iniciado-em-magia')
    expect(resolveFeatAbility(def, { spellChoices: { list: 'mago' } })).toBe('int')
    expect(resolveFeatAbility(def, { spellChoices: { list: 'clerigo' } })).toBe('wis')
    expect(resolveFeatAbility(def, { spellChoices: { list: 'bardo' } })).toBe('cha')
    expect(resolveFeatAbility(def, {})).toBeNull()
  })

  it('literal retorna direto (iniciado-artifice → int, alta-magia-drow → cha)', () => {
    expect(resolveFeatAbility(getFeatSpellDef('iniciado-artifice'), {})).toBe('int')
    expect(resolveFeatAbility(getFeatSpellDef('alta-magia-drow'), {})).toBe('cha')
  })
})

describe('isFeatSpellChoiceComplete', () => {
  it('talento sem def → true (não bloqueia nada)', () => {
    expect(isFeatSpellChoiceComplete('robusto', null)).toBe(true)
  })

  it('talento só com fixas → true mesmo sem spellChoices', () => {
    expect(isFeatSpellChoiceComplete('telepatico', null)).toBe(true)
    expect(isFeatSpellChoiceComplete('alta-magia-drow', null)).toBe(true)
  })

  it('tocado-pelas-fadas: exige 1 pick no único grant choose', () => {
    expect(isFeatSpellChoiceComplete('tocado-pelas-fadas', null)).toBe(false)
    expect(isFeatSpellChoiceComplete('tocado-pelas-fadas', { list: null, picks: [[]] })).toBe(false)
    expect(isFeatSpellChoiceComplete('tocado-pelas-fadas', { list: null, picks: [['enfeiticar-pessoa']] })).toBe(true)
  })

  it('iniciado-em-magia: exige list + 2 truques + 1 magia', () => {
    expect(isFeatSpellChoiceComplete('iniciado-em-magia', { list: null, picks: [['luz', 'raio-de-fogo'], ['escudo-arcano']] })).toBe(false)
    expect(isFeatSpellChoiceComplete('iniciado-em-magia', { list: 'mago', picks: [['luz'], ['escudo-arcano']] })).toBe(false)
    expect(isFeatSpellChoiceComplete('iniciado-em-magia', { list: 'mago', picks: [['luz', 'raio-de-fogo'], ['escudo-arcano']] })).toBe(true)
  })
})
