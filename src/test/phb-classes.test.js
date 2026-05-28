import { describe, it, expect } from 'vitest'
import classes from '../../public/srd-data/phb-classes-pt.json'

/**
 * Travas estruturais sobre o JSON de classes do PHB-PT.
 * Pega regressões tipo "Paladino com Sabedoria em vez de Carisma" (PHB p.84).
 */

const EXPECTED_SPELL_ABILITY = {
  barbaro:    null,
  bardo:      'Carisma',
  bruxo:      'Carisma',
  clerigo:    'Sabedoria',
  druida:     'Sabedoria',
  feiticeiro: 'Carisma',
  guerreiro:  null,
  ladino:     null,
  mago:       'Inteligência',
  monge:      null,
  paladino:   'Carisma',   // PHB p.84
  patrulheiro: 'Sabedoria',
}

describe('phb-classes-pt.json — spellcasting_ability', () => {
  for (const [classIndex, expected] of Object.entries(EXPECTED_SPELL_ABILITY)) {
    it(`${classIndex} → ${expected ?? 'null'}`, () => {
      const cls = classes.find(c => c.index === classIndex)
      expect(cls, `classe ${classIndex} não encontrada no JSON`).toBeDefined()
      expect(cls.spellcasting_ability).toBe(expected)
    })
  }

  it('todas as 12 classes do PHB estão presentes', () => {
    const indices = classes.map(c => c.index).sort()
    expect(indices).toEqual(Object.keys(EXPECTED_SPELL_ABILITY).sort())
  })
})
