import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { isAdditionChoice, isOptionalChoice } from '../../systems/dnd5e/domain/optionalFeatures'
import { mergeClassChoices } from '../../systems/dnd5e/domain/mergeClassChoices'

const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'))
const phb = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-class-choices-pt.json'), 'utf-8'))
const choice = (cls, id) => tasha[cls]?.choices.find(c => c.id === id)

const ADICOES = [
  ['bardo',       'bardo_magical_inspiration',        2],
  ['bardo',       'bardo_bardic_versatility',         4],
  ['bruxo',       'bruxo_mystic_versatility',         4],
  ['clerigo',     'clerigo_harness_divine_power',     2],
  ['clerigo',     'clerigo_cantrip_versatility',      4],
  ['druida',      'druida_cantrip_versatility',       4],
  ['feiticeiro',  'feiticeiro_sorcerous_versatility', 4],
  ['feiticeiro',  'feiticeiro_magical_guidance',      5],
  ['mago',        'mago_cantrip_formulas',            3],
  ['paladino',    'paladino_harness_divine_power',    3],
  ['paladino',    'paladino_martial_versatility',     4],
  ['patrulheiro', 'patrulheiro_spellcasting_focus',   2],
]

describe('C2 conjuradores — adições opcionais', () => {
  for (const [cls, id, level] of ADICOES) {
    it(`${cls}/${id}: addition válida, nível ${level}`, () => {
      const c = choice(cls, id)
      expect(c, `${id} ausente`).toBeTruthy()
      expect(isAdditionChoice(c)).toBe(true)
      expect(c.level).toBe(level)
      expect(c.options).toHaveLength(1)
      expect(c.options[0].desc.length).toBeGreaterThan(60)
      expect(c.options[0].source).toBeUndefined()
    })
  }
})

describe('Pacto do Talismã — option de lista no pact_boon do Bruxo (não opt-in)', () => {
  it('é um choice pact_boon de Tasha, NÃO optional, com a opção talisma', () => {
    const c = choice('bruxo', 'pact_boon')
    expect(c, 'pact_boon de Tasha ausente').toBeTruthy()
    expect(isOptionalChoice(c)).toBe(false)
    expect(c.options.map(o => o.value)).toContain('talisma')
  })
  it('merge concatena talisma às opções do PHB, carimbado tasha', () => {
    const merged = mergeClassChoices(phb, tasha, 'tasha')
    const pb = merged.bruxo.choices.find(c => c.id === 'pact_boon')
    const vals = pb.options.map(o => o.value)
    expect(vals).toEqual(expect.arrayContaining(['corrente', 'lamina', 'tomo', 'talisma']))
    expect(pb.options.find(o => o.value === 'talisma').source).toBe('tasha')
    expect(pb.options.find(o => o.value === 'corrente').source).toBeUndefined()
  })
})
