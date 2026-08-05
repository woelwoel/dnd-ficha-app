import { describe, it, expect } from 'vitest'
import { computeRacialBonuses, applyRacialChange, applyBackgroundChange } from '../../systems/dnd5e/domain/rules'

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

const ANTECEDENTES = [
  {
    index: 'acolito', name: 'Acólito',
    skill_proficiencies: [], equipment: '',
    ability_bonuses: [{ ability: 'INT', bonus: 2 }, { ability: 'SAB', bonus: 1 }],
    origin_feat: 'iniciado-em-magia',
  },
  {
    index: 'artesao', name: 'Artesão',
    skill_proficiencies: [], equipment: '',
    ability_bonuses: [{ ability: 'FOR', bonus: 2 }, { ability: 'DES', bonus: 1 }],
    origin_feat: 'habilidoso',
  },
]

const semEquip = () => ({ items: [], gold: 0 })
const idFake = () => 'id-1'

const fichaBg = (ruleset) => ({
  info: { name: 'X', background: null },
  attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  proficiencies: {},
  inventory: { items: [], currency: { gp: 0 } },
  meta: { settings: ruleset ? { ruleset } : {} },
})

describe('applyBackgroundChange — antecedente como origem do aumento', () => {
  it('ficha 2014 ignora ability_bonuses do antecedente', () => {
    const out = applyBackgroundChange(fichaBg(), 'acolito', ANTECEDENTES, semEquip, idFake)
    expect(out.attributes.int).toBe(10)
    expect(out.info.originFeat).toBeUndefined()
  })
  it('ficha 2024 recebe +2 INT / +1 SAB do Acólito', () => {
    const out = applyBackgroundChange(fichaBg('2024'), 'acolito', ANTECEDENTES, semEquip, idFake)
    expect(out.attributes.int).toBe(12)
    expect(out.attributes.wis).toBe(11)
    expect(out.appliedBackgroundBonuses).toEqual({ int: 2, wis: 1 })
  })
  it('ficha 2024 registra o talento de origem concedido', () => {
    const out = applyBackgroundChange(fichaBg('2024'), 'acolito', ANTECEDENTES, semEquip, idFake)
    expect(out.info.originFeat).toBe('iniciado-em-magia')
  })
  it('trocar de antecedente reverte o bônus anterior antes de somar o novo', () => {
    const um = applyBackgroundChange(fichaBg('2024'), 'acolito', ANTECEDENTES, semEquip, idFake)
    const dois = applyBackgroundChange(um, 'artesao', ANTECEDENTES, semEquip, idFake)
    expect(dois.attributes.int).toBe(10)
    expect(dois.attributes.wis).toBe(10)
    expect(dois.attributes.str).toBe(12)
    expect(dois.attributes.dex).toBe(11)
    expect(dois.info.originFeat).toBe('habilidoso')
  })
  it('remover o antecedente numa ficha 2024 zera bônus e talento', () => {
    const um = applyBackgroundChange(fichaBg('2024'), 'acolito', ANTECEDENTES, semEquip, idFake)
    const dois = applyBackgroundChange(um, null, ANTECEDENTES, semEquip, idFake)
    expect(dois.attributes.int).toBe(10)
    expect(dois.appliedBackgroundBonuses).toEqual({})
    expect(dois.info.originFeat).toBe(null)
  })
})
