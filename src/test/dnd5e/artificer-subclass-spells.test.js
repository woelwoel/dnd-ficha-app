import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { getSubclassSpellsForLevel } from '../../systems/dnd5e/domain/subclassSpells'

const read = f => JSON.parse(fs.readFileSync(path.resolve('public/srd-data', f), 'utf-8'))
const SPELL_IDX = new Set([...read('phb-spells-pt.json'), ...read('tasha-spells-pt.json')].map(s => s.index))

describe('Artífice — magias sempre-preparadas de Especialização (Tasha)', () => {
  it('Ferreiro de Batalha nv3: tier 3 sempre-preparado (Heroísmo, Shield)', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: { artificer_specialization: 'ferreiro-de-batalha' },
      classLevel: 3,
    })
    expect(result.indices).toEqual(['heroismo', 'escudo-arcano'])
    expect(result.alwaysPrepared).toBe(true)
    expect(result.source).toBe('specialization')
    expect(result.label).toBe('Especialização: ferreiro-de-batalha')
  })

  it('Ferreiro de Batalha nv5: tier 5 sempre-preparado (Marca da Punição, Vínculo Protetor)', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: { artificer_specialization: 'ferreiro-de-batalha' },
      classLevel: 5,
    })
    expect(result.indices).toEqual(['marca-da-punicao', 'vinculo-protetor'])
    expect(result.alwaysPrepared).toBe(true)
  })

  it('Ferreiro de Batalha nv4 (não é nível de tier): nenhuma magia concedida', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: { artificer_specialization: 'ferreiro-de-batalha' },
      classLevel: 4,
    })
    expect(result.indices).toEqual([])
  })

  it('Alquimista nv9: tier 9 sempre-preparado (Forma Gasosa, Palavra Curativa em Massa)', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: { artificer_specialization: 'alquimista' },
      classLevel: 9,
    })
    expect(result.indices).toEqual(['forma-gasosa', 'palavra-curativa-em-massa'])
    expect(result.alwaysPrepared).toBe(true)
    expect(result.label).toBe('Especialização: alquimista')
  })

  it('Armeiro nv13: tier 13 sempre-preparado (Escudo de Fogo, Invisibilidade Maior)', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: { artificer_specialization: 'armeiro' },
      classLevel: 13,
    })
    expect(result.indices).toEqual(['escudo-de-fogo', 'invisibilidade-maior'])
  })

  it('Atirador nv17: tier 17 sempre-preparado (Cone de Frio, Muralha de Energia)', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: { artificer_specialization: 'atirador' },
      classLevel: 17,
    })
    expect(result.indices).toEqual(['cone-de-frio', 'muralha-de-energia'])
  })

  it('Ferreiro de Batalha nv17: Banimento Destruidor + Aura da Vida (não Mass Cure Wounds)', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: { artificer_specialization: 'ferreiro-de-batalha' },
      classLevel: 17,
    })
    expect(result.indices).toEqual(['destruicao-banidora', 'aura-de-vida'])
    expect(result.indices).not.toContain('curar-ferimentos-em-massa')
  })

  it('todas as slugs concedidas pela Especialização existem no catálogo (phb+tasha)', () => {
    const specs = ['alquimista', 'armeiro', 'atirador', 'ferreiro-de-batalha']
    const missing = []
    for (const s of specs)
      for (const l of [3, 5, 9, 13, 17])
        for (const idx of getSubclassSpellsForLevel({
          classIndex: 'artifice', chosenFeatures: { artificer_specialization: s }, classLevel: l,
        }).indices)
          if (!SPELL_IDX.has(idx)) missing.push(`${s}/${l}: ${idx}`)
    expect(missing).toEqual([])
  })

  it('sem especialização escolhida: nenhuma magia concedida mesmo em nível de tier', () => {
    const result = getSubclassSpellsForLevel({
      classIndex: 'artifice',
      chosenFeatures: {},
      classLevel: 3,
    })
    expect(result.indices).toEqual([])
  })
})
