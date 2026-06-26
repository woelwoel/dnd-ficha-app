import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { getSubclassSpellsForLevel } from '../../systems/dnd5e/domain/subclassSpells'

const read = f => JSON.parse(fs.readFileSync(path.resolve('public/srd-data', f), 'utf-8'))
const phb = read('phb-spells-pt.json')
const tasha = read('tasha-spells-pt.json')
// Catálogo composto (igual ao SrdProvider): phb + tasha
const SPELL_IDX = new Set([...phb, ...tasha].map(s => s.index))
const choices = read('tasha-class-choices-pt.json')

const granted = (classIndex, chosenFeatures, classLevel) =>
  getSubclassSpellsForLevel({ classIndex, chosenFeatures, classLevel }).indices

describe('sub-projeto 4 — magias concedidas (Feiticeiro/Bruxo/Patrulheiro)', () => {
  it('Feiticeiro: Mente Aberrante e Alma Cronométrica', () => {
    expect(granted('feiticeiro', { sorcerous_origin: 'mente_aberrante' }, 1))
      .toEqual(['bracos-de-hadar', 'farpa-mental', 'sussurros-dissonantes'])
    expect(granted('feiticeiro', { sorcerous_origin: 'alma_cronometrica' }, 7))
      .toEqual(['invocar-construto', 'movimentacao-livre'])
    expect(granted('feiticeiro', { sorcerous_origin: 'mente_aberrante' }, 2)).toEqual([])
  })

  it('Patrulheiro: Andarilho Feérico e Portador do Enxame (nv 3/5/9/13/17)', () => {
    expect(granted('patrulheiro', { ranger_archetype: 'andarilho_feerico' }, 3)).toEqual(['enfeiticar-pessoa'])
    expect(granted('patrulheiro', { ranger_archetype: 'portador_do_enxame' }, 3)).toEqual(['fogo-das-fadas', 'maos-magicas'])
    expect(granted('patrulheiro', { ranger_archetype: 'andarilho_feerico' }, 4)).toEqual([])
  })

  it('Bruxo: Insondável (lista expandida por nível)', () => {
    expect(granted('bruxo', { patron: 'insondavel' }, 9)).toEqual(['cone-de-frio', 'mao-de-bigby'])
  })

  it('Bruxo: Gênio combina base + tipo escolhido', () => {
    expect(granted('bruxo', { patron: 'genio', bruxo_genie_kind: 'dao' }, 1))
      .toEqual(['detectar-o-bem-e-mal', 'santuario'])
    // Dao 3º círculo (nv5) omite Mesclar-se às Rochas → só a base
    expect(granted('bruxo', { patron: 'genio', bruxo_genie_kind: 'dao' }, 5))
      .toEqual(['criar-alimentos'])
    expect(granted('bruxo', { patron: 'genio', bruxo_genie_kind: 'ifriti' }, 3))
      .toEqual(['forca-fantasmagorica', 'raio-ardente'])
    // sem tipo escolhido → só a base
    expect(granted('bruxo', { patron: 'genio' }, 1)).toEqual(['detectar-o-bem-e-mal'])
  })

  it('regressão: patronos do PHB seguem funcionando', () => {
    expect(granted('bruxo', { patron: 'infernal' }, 1)).toEqual(['maos-flamejantes', 'comando'])
  })

  it('TODO slug concedido existe no catálogo composto (phb + tasha)', () => {
    const missing = []
    const check = (label, idxs) => idxs.forEach(i => { if (!SPELL_IDX.has(i)) missing.push(`${label}: ${i}`) })
    for (const o of ['mente_aberrante', 'alma_cronometrica'])
      for (const l of [1, 3, 5, 7, 9]) check(`feiticeiro/${o}/${l}`, granted('feiticeiro', { sorcerous_origin: o }, l))
    for (const a of ['andarilho_feerico', 'portador_do_enxame'])
      for (const l of [3, 5, 9, 13, 17]) check(`patrulheiro/${a}/${l}`, granted('patrulheiro', { ranger_archetype: a }, l))
    for (const l of [1, 3, 5, 7, 9]) check(`bruxo/insondavel/${l}`, granted('bruxo', { patron: 'insondavel' }, l))
    for (const k of ['dao', 'djinni', 'ifriti', 'marid'])
      for (const l of [1, 3, 5, 7, 9]) check(`bruxo/genio/${k}/${l}`, granted('bruxo', { patron: 'genio', bruxo_genie_kind: k }, l))
    expect(missing).toEqual([])
  })
})

describe('sub-projeto 4 — catálogo de magias de Tasha', () => {
  it('tasha-spells contém as 3 magias do sub-proj 4, carimbadas source tasha', () => {
    // O catálogo cresceu além das 3 originais (balde de magias do TCE), mas as
    // 3 deste sub-projeto continuam presentes e todas seguem carimbadas.
    const idx = tasha.map(s => s.index)
    for (const i of ['farpa-mental', 'invocar-aberracao', 'invocar-construto']) expect(idx).toContain(i)
    for (const s of tasha) expect(s.source).toBe('tasha')
    expect(tasha.find(s => s.index === 'farpa-mental').level).toBe(0)
  })
})

describe('sub-projeto 4 — dados das subclasses', () => {
  const EXPECTED = {
    feiticeiro:  { choiceId: 'sorcerous_origin', level: 1, subs: ['mente_aberrante', 'alma_cronometrica'] },
    bruxo:       { choiceId: 'patron',           level: 1, subs: ['insondavel', 'genio'] },
    patrulheiro: { choiceId: 'ranger_archetype', level: 3, subs: ['andarilho_feerico', 'portador_do_enxame'] },
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

  it('Gênio: subescolha de tipo gated com dao/djinni/ifriti/marid', () => {
    const k = choices.bruxo.choices.find(c => c.id === 'bruxo_genie_kind')
    expect(k.requires).toEqual({ patron: 'genio' })
    expect(k.options.map(o => o.value).sort()).toEqual(['dao', 'djinni', 'ifriti', 'marid'])
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
