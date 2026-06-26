import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { mergeClassChoices } from '../../systems/dnd5e/domain/mergeClassChoices'

const tasha = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'),
)
const phb = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/phb-class-choices-pt.json'), 'utf-8'),
)

function tashaOptions(cls, choiceId) {
  const choice = tasha[cls]?.choices.find(c => c.id === choiceId)
  return choice?.options ?? []
}

describe('Tasha opções opcionais — invocações místicas (bruxo)', () => {
  const ESPERADAS = [
    'ligado_ao_talisma', 'mente_mistica', 'escrita_longinqua',
    'dadiva_dos_protetores', 'implemento_mestre_corrente',
    'protecao_do_talisma', 'repreensao_do_talisma', 'servidao_eterna',
  ]

  it('o arquivo Tasha tem o choice eldritch_invocations com as 8 invocações', () => {
    const opts = tashaOptions('bruxo', 'eldritch_invocations')
    const valores = opts.map(o => o.value)
    for (const v of ESPERADAS) expect(valores, `${v} ausente`).toContain(v)
    for (const o of opts) expect(o.desc.length, o.value).toBeGreaterThan(40)
  })

  it('nenhuma invocação grava source no arquivo cru', () => {
    for (const o of tashaOptions('bruxo', 'eldritch_invocations')) {
      expect(o.source, o.value).toBeUndefined()
    }
  })

  it('merge concatena as invocações de Tasha (carimbadas) com as do PHB', () => {
    const merged = mergeClassChoices(phb, tasha, 'tasha')
    const choice = merged.bruxo.choices.find(c => c.id === 'eldritch_invocations')
    const tashaOnes = choice.options.filter(o => o.source === 'tasha')
    expect(tashaOnes.map(o => o.value).sort()).toEqual([...ESPERADAS].sort())
    // PHB segue presente e sem source
    expect(choice.options.some(o => o.value === 'forca_agonizante' && !o.source)).toBe(true)
  })
})

describe('Tasha opções opcionais — metamagia (feiticeiro)', () => {
  const ESPERADAS = ['perseguidora', 'transmutada']
  const IDS = ['metamagic', 'metamagic_10', 'metamagic_17']

  it('cada choice de metamagia ganha as 2 opções de Tasha', () => {
    for (const id of IDS) {
      const opts = tashaOptions('feiticeiro', id)
      const valores = opts.map(o => o.value)
      for (const v of ESPERADAS) expect(valores, `${id}/${v}`).toContain(v)
    }
  })

  it('merge concatena a metamagia de Tasha com a do PHB em metamagic', () => {
    const merged = mergeClassChoices(phb, tasha, 'tasha')
    const choice = merged.feiticeiro.choices.find(c => c.id === 'metamagic')
    const tashaOnes = choice.options.filter(o => o.source === 'tasha').map(o => o.value).sort()
    expect(tashaOnes).toEqual([...ESPERADAS].sort())
  })
})

describe('Tasha opções opcionais — estilos de combate', () => {
  const CASOS = [
    { cls: 'guerreiro',   id: 'fighting_style',         vals: ['luta_as_cegas', 'interceptador', 'tecnica_superior', 'arremesso_de_armas', 'ataque_desarmado'] },
    { cls: 'paladino',    id: 'fighting_style_paladin',  vals: ['guerreiro_abencoado', 'luta_as_cegas', 'interceptador'] },
    { cls: 'patrulheiro', id: 'fighting_style_ranger',   vals: ['luta_as_cegas', 'guerreiro_druidico', 'arremesso_de_armas'] },
  ]

  for (const { cls, id, vals } of CASOS) {
    it(`${cls}: ${id} ganha os estilos de Tasha`, () => {
      const valores = tashaOptions(cls, id).map(o => o.value)
      for (const v of vals) expect(valores, `${cls}/${v}`).toContain(v)
    })
    it(`${cls}: estilos de Tasha entram no merge carimbados`, () => {
      const merged = mergeClassChoices(phb, tasha, 'tasha')
      const choice = merged[cls].choices.find(c => c.id === id)
      const tashaOnes = choice.options.filter(o => o.source === 'tasha').map(o => o.value)
      for (const v of vals) expect(tashaOnes, `${cls}/${v} sem carimbo`).toContain(v)
    })
  }
})

describe('Tasha opções opcionais — manobras (guerreiro)', () => {
  const ESPERADAS = [
    'emboscada', 'engodo', 'enganchar', 'presenca-dominante',
    'golpe-imobilizador', 'lancamento-rapido', 'avaliacao-tatica',
  ]

  it('o choice martial_archetype_maneuvers ganha as 7 manobras de Tasha', () => {
    const valores = tashaOptions('guerreiro', 'martial_archetype_maneuvers').map(o => o.value)
    for (const v of ESPERADAS) expect(valores, `${v} ausente`).toContain(v)
  })

  it('as manobras de Tasha entram no merge carimbadas e somadas às do PHB', () => {
    const merged = mergeClassChoices(phb, tasha, 'tasha')
    const choice = merged.guerreiro.choices.find(c => c.id === 'martial_archetype_maneuvers')
    const tashaOnes = choice.options.filter(o => o.source === 'tasha').map(o => o.value).sort()
    expect(tashaOnes).toEqual([...ESPERADAS].sort())
    expect(choice.options.some(o => o.value === 'ataque-ardiloso' && !o.source)).toBe(true)
  })
})
