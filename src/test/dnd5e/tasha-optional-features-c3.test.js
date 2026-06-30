import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { isOptionalChoice, isAdditionChoice } from '../../systems/dnd5e/domain/optionalFeatures'

const tasha = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'))
const prog = JSON.parse(fs.readFileSync(path.resolve('public/srd-data/phb-class-progression-pt.json'), 'utf-8'))
const choice = (cls, id) => tasha[cls]?.choices.find(c => c.id === id)
const baseNames = cls => (prog[cls]?.levels ?? []).flatMap(l => (l.features ?? []).map(f => f.name))

describe('C3 — substituições do Patrulheiro (com âncora na progressão)', () => {
  it('ranger_primal_awareness substitui Consciência Primeva (nv3, valor consciencia_primordial)', () => {
    const c = choice('patrulheiro', 'ranger_primal_awareness')
    expect(c).toBeTruthy()
    expect(isOptionalChoice(c)).toBe(true)
    expect(isAdditionChoice(c)).toBe(false)
    expect(c.featureName).toBe('Consciência Primeva')
    expect(baseNames('patrulheiro')).toContain('Consciência Primeva')
    expect(c.level).toBe(3)
    expect(c.options.map(o => o.value)).toEqual(['consciencia_primordial'])
  })
  it('ranger_natures_veil substitui Ocultar-se às Claras (nv10)', () => {
    const c = choice('patrulheiro', 'ranger_natures_veil')
    expect(c.featureName).toBe('Ocultar-se às Claras')
    expect(baseNames('patrulheiro')).toContain('Ocultar-se às Claras')
    expect(isAdditionChoice(c)).toBe(false)
    expect(c.level).toBe(10)
    expect(c.options.map(o => o.value)).toEqual(['veu_natural'])
  })
})

describe('C3 — adições', () => {
  it('patrulheiro_martial_versatility (adição nv4)', () => {
    const c = choice('patrulheiro', 'patrulheiro_martial_versatility')
    expect(isAdditionChoice(c)).toBe(true)
    expect(c.level).toBe(4)
  })
  it('clerigo_blessed_strikes (adição nv8, desc cita substituição de Golpe Divino/Conjuração Poderosa)', () => {
    const c = choice('clerigo', 'clerigo_blessed_strikes')
    expect(isAdditionChoice(c)).toBe(true)
    expect(c.level).toBe(8)
    expect(c.options[0].desc.toLowerCase()).toContain('substitui')
    expect(c.options[0].combat).toBe('situacional')
  })
})

describe('C3 — options não gravam source no cru', () => {
  it('sem source', () => {
    for (const [cls, id] of [['patrulheiro', 'ranger_primal_awareness'], ['patrulheiro', 'ranger_natures_veil'], ['patrulheiro', 'patrulheiro_martial_versatility'], ['clerigo', 'clerigo_blessed_strikes']]) {
      for (const o of choice(cls, id).options) expect(o.source).toBeUndefined()
    }
  })
})
