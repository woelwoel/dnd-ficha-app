import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { getClericDomainSpellIndices } from '../../systems/dnd5e/domain/rules'
import { getSubclassSpellsForLevel } from '../../systems/dnd5e/domain/subclassSpells'

const spells = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/phb-spells-pt.json'), 'utf-8'),
)
const SPELL_IDX = new Set(spells.map(s => s.index))

const choices = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'),
)

describe('sub-projeto 3 — magias concedidas (Clérigo/Druida/Paladino de Tasha)', () => {
  it('domínios de clérigo de Tasha concedem as magias certas', () => {
    expect(getClericDomainSpellIndices('ordem', 1)).toEqual(['comando', 'heroismo'])
    expect(getClericDomainSpellIndices('paz', 3)).toEqual(['auxilio-divino', 'vinculo-protetor'])
    expect(getClericDomainSpellIndices('crepusculo', 7)).toEqual(['aura-de-vida', 'invisibilidade-maior'])
    // nível sem concessão
    expect(getClericDomainSpellIndices('ordem', 4)).toEqual([])
  })

  it('juramentos de paladino de Tasha concedem (sempre preparadas)', () => {
    const g = getSubclassSpellsForLevel({ classIndex: 'paladino', chosenFeatures: { sacred_oath: 'gloria' }, classLevel: 3 })
    expect(g.indices).toEqual(['raio-guiador', 'heroismo'])
    expect(g.alwaysPrepared).toBe(true)
    const v = getSubclassSpellsForLevel({ classIndex: 'paladino', chosenFeatures: { sacred_oath: 'vigilancia' }, classLevel: 9 })
    expect(v.indices).toEqual(['contramagica', 'nao-detectar'])
  })

  it('círculos de druida de Tasha concedem por nível [2,3,5,7,9]', () => {
    const esp2 = getSubclassSpellsForLevel({ classIndex: 'druida', chosenFeatures: { druid_circle: 'esporos' }, classLevel: 2 })
    expect(esp2.indices).toEqual(['toque-arrepiante'])
    expect(esp2.source).toBe('circle')
    const fogo7 = getSubclassSpellsForLevel({ classIndex: 'druida', chosenFeatures: { druid_circle: 'fogo-selvagem' }, classLevel: 7 })
    expect(fogo7.indices).toEqual(['aura-de-vida', 'escudo-de-fogo'])
    // Estrelas: só Raio Guia no nv2 (Mapa Estelar), nada nos demais
    expect(getSubclassSpellsForLevel({ classIndex: 'druida', chosenFeatures: { druid_circle: 'estrelas' }, classLevel: 2 }).indices).toEqual(['raio-guiador'])
    expect(getSubclassSpellsForLevel({ classIndex: 'druida', chosenFeatures: { druid_circle: 'estrelas' }, classLevel: 5 }).indices).toEqual([])
  })

  it('regressão: Círculo da Terra (PHB) continua funcionando', () => {
    const terra = getSubclassSpellsForLevel({ classIndex: 'druida', chosenFeatures: { druid_circle: 'terra', druid_land_type: 'floresta' }, classLevel: 3 })
    expect(terra.indices).toEqual(['pele-de-arvore', 'patas-de-aranha'])
  })

  it('TODO slug concedido existe no catálogo de magias (pega typo)', () => {
    const missing = []
    // domínios
    for (const dom of ['ordem', 'paz', 'crepusculo']) {
      for (const lvl of [1, 3, 5, 7, 9]) {
        for (const idx of getClericDomainSpellIndices(dom, lvl)) {
          if (!SPELL_IDX.has(idx)) missing.push(`clerigo/${dom}/${lvl}: ${idx}`)
        }
      }
    }
    // juramentos
    for (const oath of ['gloria', 'vigilancia']) {
      for (const lvl of [3, 5, 9, 13, 17]) {
        for (const idx of getSubclassSpellsForLevel({ classIndex: 'paladino', chosenFeatures: { sacred_oath: oath }, classLevel: lvl }).indices) {
          if (!SPELL_IDX.has(idx)) missing.push(`paladino/${oath}/${lvl}: ${idx}`)
        }
      }
    }
    // círculos
    for (const circle of ['esporos', 'fogo-selvagem', 'estrelas']) {
      for (const lvl of [2, 3, 5, 7, 9]) {
        for (const idx of getSubclassSpellsForLevel({ classIndex: 'druida', chosenFeatures: { druid_circle: circle }, classLevel: lvl }).indices) {
          if (!SPELL_IDX.has(idx)) missing.push(`druida/${circle}/${lvl}: ${idx}`)
        }
      }
    }
    expect(missing).toEqual([])
  })
})

describe('sub-projeto 3 — dados das subclasses', () => {
  const EXPECTED = {
    clerigo:  { choiceId: 'divine_domain', level: 1, subs: ['ordem', 'paz', 'crepusculo'] },
    druida:   { choiceId: 'druid_circle',  level: 2, subs: ['esporos', 'estrelas', 'fogo-selvagem'] },
    paladino: { choiceId: 'sacred_oath',   level: 3, subs: ['gloria', 'vigilancia'] },
  }
  for (const [cls, { choiceId, level, subs }] of Object.entries(EXPECTED)) {
    it(`${cls}: choice ${choiceId} (nv ${level}) com as subclasses de Tasha`, () => {
      const choice = choices[cls].choices.find(c => c.id === choiceId)
      expect(choice.level).toBe(level)
      for (const s of subs) {
        const opt = choice.options.find(o => o.value === s)
        expect(opt, `${cls}/${s}`).toBeTruthy()
        expect(opt.desc.length).toBeGreaterThan(40)
      }
    })
  }

  it('Forma Estelar: subescolha gated com Arqueiro/Cálice/Dragão', () => {
    const sf = choices.druida.choices.find(c => c.id === 'druida_starry_form')
    expect(sf.requires).toEqual({ druid_circle: 'estrelas' })
    expect(sf.options.map(o => o.value).sort()).toEqual(['arqueiro', 'calice', 'dragao'])
  })

  it('nenhuma opção das novas classes carrega source no arquivo cru', () => {
    for (const cls of Object.keys(EXPECTED)) {
      for (const choice of choices[cls].choices) {
        for (const opt of choice.options ?? []) {
          expect(opt.source, `${cls}/${opt.value}`).toBeUndefined()
        }
      }
    }
  })
})
