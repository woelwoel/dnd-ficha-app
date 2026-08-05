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
  // ATENÇÃO: não teste isso partindo de uma ficha limpa — em 2024 o guard zera
  // os bônus, `appliedRacialBonuses` nunca fica não-vazio, e o laço de reversão
  // nunca itera. O teste passaria mesmo com a reversão quebrada.
  it('ficha 2024 com resíduo persistido reverte ao trocar de espécie', () => {
    const comResiduo = {
      ...ficha('2024'),
      attributes: { str: 10, dex: 10, con: 12, int: 10, wis: 10, cha: 10 },
      appliedRacialBonuses: { con: 2 }, // ficha adulterada/importada
    }
    const out = applyRacialChange(comResiduo, { race: null }, null, null, RACAS)
    expect(out.attributes.con).toBe(10)
    expect(out.appliedRacialBonuses).toEqual({})
  })
})
