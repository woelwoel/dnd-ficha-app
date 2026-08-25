import { describe, it, expect } from 'vitest'
import {
  BLOOD_HUNTER, RITES, riteDieFor, bloodCursesKnown,
  bloodHunterLevel, hemocraftDC, activeRites, bloodHunterMaxHpPenalty, riteDamageFor,
} from '../../systems/dnd5e/domain/bloodHunter'

describe('bloodHunter — tabelas da classe', () => {
  it('usa o index canônico da classe', () => {
    expect(BLOOD_HUNTER).toBe('cacador-de-sangue')
  })

  it('escala o dado de rito a cada 5 níveis', () => {
    const esperado = {
      1: '1d4', 5: '1d4', 6: '1d6', 10: '1d6',
      11: '1d8', 15: '1d8', 16: '1d10', 20: '1d10',
    }
    for (const [nivel, dado] of Object.entries(esperado)) {
      expect(riteDieFor(Number(nivel))).toBe(dado)
    }
  })

  it('devolve o menor dado para nível inválido em vez de quebrar', () => {
    expect(riteDieFor(0)).toBe('1d4')
    expect(riteDieFor(undefined)).toBe('1d4')
    expect(riteDieFor(99)).toBe('1d10')
  })

  it('conta maldições de sangue conhecidas por nível', () => {
    expect(bloodCursesKnown(1)).toBe(0)
    expect(bloodCursesKnown(2)).toBe(1)
    expect(bloodCursesKnown(4)).toBe(1)
    expect(bloodCursesKnown(5)).toBe(2)
    expect(bloodCursesKnown(9)).toBe(3)
    expect(bloodCursesKnown(13)).toBe(4)
    expect(bloodCursesKnown(16)).toBe(5)
    expect(bloodCursesKnown(20)).toBe(6)
  })

  it('separa Rituais Primais de Esotéricos com o tipo de dano do app', () => {
    expect(RITES.chamas).toEqual({ name: 'Ritual das Chamas', damageType: 'fogo', tier: 'primal' })
    expect(RITES.congelamento.damageType).toBe('frio')
    expect(RITES.tempestade.damageType).toBe('elétrico')
    expect(RITES.rugido).toEqual({ name: 'Ritual do Rugido', damageType: 'trovejante', tier: 'esoteric' })
    expect(RITES.eter.damageType).toBe('psíquico')
    expect(RITES.morto.damageType).toBe('necrótico')
    expect(Object.keys(RITES)).toHaveLength(6)
  })
})

/** Ficha mínima de caçador de sangue para os testes de regra. */
function ficha({ level = 5, wis = 16, rites = [], multiclasses = [] } = {}) {
  return {
    info: { level, classIndex: BLOOD_HUNTER, multiclasses },
    attributes: { wisdom: wis },
    combat: { maxHp: 44, currentHp: 44, crimsonRites: rites },
  }
}

describe('bloodHunter — nível de classe', () => {
  it('lê o nível da classe principal', () => {
    expect(bloodHunterLevel(ficha({ level: 7 }))).toBe(7)
  })

  it('lê o nível da multiclasse quando a classe principal é outra', () => {
    const char = {
      info: { level: 3, classIndex: 'guerreiro', multiclasses: [{ classIndex: BLOOD_HUNTER, level: 4 }] },
    }
    expect(bloodHunterLevel(char)).toBe(4)
  })

  it('devolve 0 para quem não é caçador de sangue', () => {
    expect(bloodHunterLevel({ info: { level: 9, classIndex: 'mago' } })).toBe(0)
  })
})

describe('bloodHunter — CD de Hemocraft', () => {
  it('é 8 + proficiência + modificador de Sabedoria', () => {
    // nível 5 → proficiência +3; SAB 16 → +3. 8 + 3 + 3 = 14
    expect(hemocraftDC(ficha({ level: 5, wis: 16 }))).toBe(14)
    // nível 1 → proficiência +2; SAB 10 → +0. 8 + 2 + 0 = 10
    expect(hemocraftDC(ficha({ level: 1, wis: 10 }))).toBe(10)
    // nível 17 → proficiência +6; SAB 20 → +5. 8 + 6 + 5 = 19
    expect(hemocraftDC(ficha({ level: 17, wis: 20 }))).toBe(19)
  })
})

describe('bloodHunter — redutor de PV máximo', () => {
  it('é zero sem rito ativo', () => {
    expect(bloodHunterMaxHpPenalty(ficha({ level: 5 }))).toBe(0)
  })

  it('custa o nível de personagem por rito ativo', () => {
    expect(bloodHunterMaxHpPenalty(ficha({ level: 5, rites: [{ attackId: 'a1', rite: 'chamas' }] }))).toBe(5)
  })

  it('acumula quando há rito em mais de uma arma', () => {
    const rites = [{ attackId: 'a1', rite: 'chamas' }, { attackId: 'a2', rite: 'morto' }]
    expect(bloodHunterMaxHpPenalty(ficha({ level: 5, rites }))).toBe(10)
  })

  it('usa o nível de PERSONAGEM, não o de classe, na multiclasse', () => {
    const char = {
      info: { level: 3, classIndex: 'guerreiro', multiclasses: [{ classIndex: BLOOD_HUNTER, level: 2 }] },
      attributes: { wisdom: 14 },
      combat: { crimsonRites: [{ attackId: 'a1', rite: 'chamas' }] },
    }
    // 3 de guerreiro + 2 de caçador de sangue = nível de personagem 5
    expect(bloodHunterMaxHpPenalty(char)).toBe(5)
  })

  it('é zero no 20º nível de classe — Maestria Sanguínea', () => {
    expect(bloodHunterMaxHpPenalty(ficha({ level: 20, rites: [{ attackId: 'a1', rite: 'chamas' }] }))).toBe(0)
  })

  it('ignora rito com chave desconhecida em vez de cobrar por ele', () => {
    expect(bloodHunterMaxHpPenalty(ficha({ level: 5, rites: [{ attackId: 'a1', rite: 'inexistente' }] }))).toBe(0)
  })
})

describe('bloodHunter — dano do rito por arma', () => {
  it('devolve dado e tipo só para a arma imbuída', () => {
    const char = ficha({ level: 11, rites: [{ attackId: 'espada', rite: 'chamas' }] })
    expect(riteDamageFor({ id: 'espada' }, char)).toEqual({ dice: '1d8', damageType: 'fogo' })
    expect(riteDamageFor({ id: 'arco' }, char)).toBeNull()
  })

  it('devolve null quando não há rito ativo', () => {
    expect(riteDamageFor({ id: 'espada' }, ficha())).toBeNull()
  })

  it('lista os ritos ativos ignorando entradas malformadas', () => {
    const char = ficha({ rites: [{ attackId: 'a1', rite: 'chamas' }, { rite: 'morto' }, null] })
    expect(activeRites(char)).toEqual([{ attackId: 'a1', rite: 'chamas' }])
  })
})
