import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  FEAT_SPELL_GRANTS, LIST_ABILITY, getFeatSpellDef, getChooseGrants,
  resolveFeatAbility, isFeatSpellChoiceComplete, resolveFeatSpellOptions,
} from '../../systems/dnd5e/domain/featSpells'

const allSpells = [
  ...JSON.parse(readFileSync('public/srd-data/phb-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/tasha-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/xanathar-spells-pt.json', 'utf8')),
]
const spellIdxSet = new Set(allSpells.map(s => s.index))
const spellMechanics = JSON.parse(readFileSync('public/srd-data/spell-mechanics-pt.json', 'utf8'))

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

  it('atirador-de-magia: pickList exclui bardo/clerigo (sem truque de ataque)', () => {
    expect(FEAT_SPELL_GRANTS['atirador-de-magia'].pickList).toEqual(['bruxo', 'druida', 'feiticeiro', 'mago'])
  })

  it('invariantes estruturais de toda declaração', () => {
    for (const [feat, def] of Object.entries(FEAT_SPELL_GRANTS)) {
      expect(Array.isArray(def.grants), feat).toBe(true)
      expect(def.grants.length, feat).toBeGreaterThan(0)
      // byList ⟺ pickList: sem pickList o gate não exige `list` e ability vira null
      expect(!!def.pickList, feat).toBe(def.ability === 'byList')
      for (const l of def.pickList ?? []) expect(LIST_ABILITY[l], `${feat}: ${l}`).toBeTruthy()
      for (const g of def.grants) {
        expect(!!g.fixed !== !!g.choose, feat).toBe(true)
        if (g.choose) {
          expect(typeof g.choose.count, feat).toBe('number')
          expect(typeof g.choose.level, feat).toBe('number')
        }
      }
    }
  })
})

describe('getChooseGrants', () => {
  it('getChooseGrants: ordinal ≠ grantIdx quando fixa vem antes de choose', () => {
    expect(getChooseGrants('tocado-pelas-fadas')).toEqual([
      expect.objectContaining({ grantIdx: 1, ordinal: 0 }),
    ])
    expect(getChooseGrants('iniciado-em-magia').map(g => [g.grantIdx, g.ordinal]))
      .toEqual([[0, 0], [1, 1]])
    expect(getChooseGrants('telepatico')).toEqual([])
    expect(getChooseGrants('robusto')).toEqual([])
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

  it('over-pick também é incompleto (strict !==, não >=)', () => {
    expect(isFeatSpellChoiceComplete('tocado-pelas-fadas', { picks: [['enfeiticar-pessoa', 'comando']] })).toBe(false)
  })

  it('iniciado-em-magia: exige list + 2 truques + 1 magia', () => {
    expect(isFeatSpellChoiceComplete('iniciado-em-magia', { list: null, picks: [['luz', 'raio-de-fogo'], ['escudo-arcano']] })).toBe(false)
    expect(isFeatSpellChoiceComplete('iniciado-em-magia', { list: 'mago', picks: [['luz'], ['escudo-arcano']] })).toBe(false)
    expect(isFeatSpellChoiceComplete('iniciado-em-magia', { list: 'mago', picks: [['luz', 'raio-de-fogo'], ['escudo-arcano']] })).toBe(true)
  })
})

describe('resolveFeatSpellOptions', () => {
  it('tocado-pelas-fadas: 1º círculo de adivinhação/encantamento (21 no catálogo atual)', () => {
    const opts = resolveFeatSpellOptions('tocado-pelas-fadas', 1, { srdSpells: allSpells })
    expect(opts.length).toBe(21)
    expect(opts.every(s => s.level === 1)).toBe(true)
    expect(opts.every(s => ['adivinhação', 'encantamento'].includes(s.school))).toBe(true)
    expect(opts.some(s => s.index === 'enfeiticar-pessoa')).toBe(true)
  })

  it('tocado-pelas-sombras: ilusão/necromancia (9 no catálogo atual)', () => {
    const opts = resolveFeatSpellOptions('tocado-pelas-sombras', 1, { srdSpells: allSpells })
    expect(opts.length).toBe(9)
  })

  it('grant sem choose (fixa) → []', () => {
    expect(resolveFeatSpellOptions('tocado-pelas-fadas', 0, { srdSpells: allSpells })).toEqual([])
  })

  it('fromList sem list escolhida → []', () => {
    expect(resolveFeatSpellOptions('iniciado-em-magia', 0, { srdSpells: allSpells })).toEqual([])
  })

  it('iniciado-em-magia com list mago: truques da lista do mago', () => {
    const opts = resolveFeatSpellOptions('iniciado-em-magia', 0, { list: 'mago', srdSpells: allSpells })
    expect(opts.length).toBeGreaterThan(0)
    expect(opts.every(s => s.level === 0 && (s.classes ?? []).includes('mago'))).toBe(true)
  })

  it('iniciado-artifice: list fixa artifice, 14 truques no catálogo atual', () => {
    const opts = resolveFeatSpellOptions('iniciado-artifice', 0, { srdSpells: allSpells })
    expect(opts.length).toBe(14)
    expect(opts.every(s => (s.classes ?? []).includes('artifice'))).toBe(true)
  })

  it('conjurador-de-ritual com list mago: só rituais de 1º da lista', () => {
    const opts = resolveFeatSpellOptions('conjurador-de-ritual', 0, { list: 'mago', srdSpells: allSpells })
    expect(opts.length).toBeGreaterThan(0)
    expect(opts.every(s => s.ritual === true && s.level === 1 && (s.classes ?? []).includes('mago'))).toBe(true)
  })

  it('atirador-de-magia com list bruxo: inclui rajada-mistica', () => {
    const opts = resolveFeatSpellOptions('atirador-de-magia', 0, { list: 'bruxo', srdSpells: allSpells, spellMechanics })
    expect(opts.some(s => s.index === 'rajada-mistica')).toBe(true)
    expect(opts.every(s => s.level === 0)).toBe(true)
  })

  it('GUARD-RAIL: conjunto de truques de ataque derivado do spell-mechanics', () => {
    // Congela o conjunto derivado (attack:true + level 0) — se o
    // spell-mechanics mudar, este teste avisa. Ao falhar: imprima o
    // recebido, confira nome a nome se são truques com jogada de ataque
    // e atualize a lista conscientemente.
    const cantripIdx = new Set(allSpells.filter(s => s.level === 0).map(s => s.index))
    const derived = Object.entries(spellMechanics)
      .filter(([idx, m]) => m && m.attack === true && cantripIdx.has(idx))
      .map(([idx]) => idx)
      .sort()
    expect(derived).toHaveLength(9)
    expect(derived).toContain('rajada-mistica')
    expect(derived).toContain('raio-de-fogo')
    expect(derived).toContain('toque-chocante')
  })

  it('magia-do-elfo-da-floresta: truques de druida', () => {
    const opts = resolveFeatSpellOptions('magia-do-elfo-da-floresta', 0, { srdSpells: allSpells })
    expect(opts.length).toBeGreaterThan(0)
    expect(opts.every(s => s.level === 0 && (s.classes ?? []).includes('druida'))).toBe(true)
  })
})
