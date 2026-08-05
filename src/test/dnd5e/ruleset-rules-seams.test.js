import { describe, it, expect } from 'vitest'
import { computeRacialBonuses, applyRacialChange } from '../../systems/dnd5e/domain/rules'

const RACAS = [
  { index: 'anao', ability_bonuses: [{ ability: 'CON', bonus: 2 }], subraces: [] },
]

const ficha = (ruleset) => ({
  info: { name: 'X' },
  attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  appliedRacialBonuses: {},
  meta: { settings: ruleset ? { ruleset } : {} },
})

describe('computeRacialBonuses — origem do aumento de atributo', () => {
  it('2014 (padrão): soma os bônus da raça', () => {
    expect(computeRacialBonuses('anao', null, RACAS)).toEqual({ con: 2 })
  })
  it('quando o aumento não vem da raça, devolve vazio', () => {
    expect(computeRacialBonuses('anao', null, RACAS, { abilityBonusFrom: 'background' })).toEqual({})
  })
})

describe('applyRacialChange — respeita a geração da ficha', () => {
  it('ficha 2014 recebe +2 CON do anão', () => {
    const out = applyRacialChange(ficha(), { race: 'anao' }, 'anao', null, RACAS)
    expect(out.attributes.con).toBe(12)
    expect(out.appliedRacialBonuses).toEqual({ con: 2 })
  })
  it('ficha 2024 NÃO recebe atributo da espécie', () => {
    const out = applyRacialChange(ficha('2024'), { race: 'anao' }, 'anao', null, RACAS)
    expect(out.attributes.con).toBe(10)
    expect(out.appliedRacialBonuses).toEqual({})
  })
  it('trocar de espécie numa ficha 2024 não deixa resíduo de atributo', () => {
    const um = applyRacialChange(ficha('2024'), { race: 'anao' }, 'anao', null, RACAS)
    const dois = applyRacialChange(um, { race: null }, null, null, RACAS)
    expect(dois.attributes.con).toBe(10)
  })
})
