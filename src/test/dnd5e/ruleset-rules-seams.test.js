import { describe, it, expect } from 'vitest'
import { computeRacialBonuses, applyRacialChange, applyBackgroundChange } from '../../systems/dnd5e/domain/rules'

const RACAS = [
  { index: 'anao', ability_bonuses: [{ ability: 'CON', bonus: 2 }], subraces: [] },
]

// Raça que declara o atributo por ABREVIAÇÃO em PT em vez de nome completo.
// `phb-races-pt.json` usa nome completo hoje, então este formato é dormente —
// mas o antecedente 2024 usa abreviação e nada impede uma fonte futura de
// espécie fazer o mesmo. 'SAB' é o caso que expõe o defeito: `toLowerCase()`
// produziria 'sab', que não é chave de atributo, e o bônus sumiria calado.
const RACAS_ABREV = [
  { index: 'aasimar', ability_bonuses: [{ ability: 'SAB', bonus: 2 }], subraces: [] },
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
  it('resolve atributo declarado por abreviação em PT', () => {
    expect(computeRacialBonuses('aasimar', null, RACAS_ABREV)).toEqual({ wis: 2 })
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

// O mapa de bônus aplicados guarda o delta EFETIVAMENTE absorvido, não o
// solicitado. Guardar o solicitado causa drift: um atributo em 19 que recebe
// +2 sobe só 1 (teto 20), e reverter 2 depois roubaria um ponto que não veio
// deste bônus. Alcançável na prática — antecedente é editável pela ficha em
// qualquer nível, depois de ASIs já terem subido o atributo.
describe('teto de 20 não produz drift ao reverter', () => {
  it('raça: atributo em 19 que recebe +2 volta a 19, não a 18', () => {
    const quaseNoTeto = {
      ...ficha(),
      attributes: { str: 10, dex: 10, con: 19, int: 10, wis: 10, cha: 10 },
    }
    const um = applyRacialChange(quaseNoTeto, { race: 'anao' }, 'anao', null, RACAS)
    expect(um.attributes.con).toBe(20)
    expect(um.appliedRacialBonuses).toEqual({ con: 1 })

    const dois = applyRacialChange(um, { race: null }, null, null, RACAS)
    expect(dois.attributes.con).toBe(19)
  })

  it('antecedente: atributo em 19 que recebe +2 volta a 19, não a 18', () => {
    const quaseNoTeto = {
      ...fichaBg('2024'),
      attributes: { str: 10, dex: 10, con: 10, int: 19, wis: 10, cha: 10 },
    }
    const um = applyBackgroundChange(quaseNoTeto, 'acolito', ANTECEDENTES, semEquip, idFake)
    expect(um.attributes.int).toBe(20)
    expect(um.appliedBackgroundBonuses).toEqual({ int: 1, wis: 1 })

    const dois = applyBackgroundChange(um, 'artesao', ANTECEDENTES, semEquip, idFake)
    expect(dois.attributes.int).toBe(19)
    expect(dois.attributes.wis).toBe(10)
  })
})

// O builder da Task 7 ainda não rodou e um primeiro rascunho pode sair sem
// esses campos. Degradar em silêncio é aceitável aqui; lançar ou gravar NaN
// na ficha do jogador não é.
describe('antecedente com dado incompleto', () => {
  const INCOMPLETO = [
    { index: 'rascunho', name: 'Rascunho', skill_proficiencies: [], equipment: '' },
  ]

  it('sem ability_bonuses nem origin_feat: não lança, não produz NaN', () => {
    const out = applyBackgroundChange(fichaBg('2024'), 'rascunho', INCOMPLETO, semEquip, idFake)
    expect(out.attributes).toEqual({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 })
    expect(out.appliedBackgroundBonuses).toEqual({})
    expect(out.info.originFeat).toBe(null)
  })
})
