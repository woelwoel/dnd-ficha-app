import { describe, it, expect } from 'vitest'
import { BLOOD_HUNTER, RITES, riteDieFor, bloodCursesKnown } from '../../systems/dnd5e/domain/bloodHunter'

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
