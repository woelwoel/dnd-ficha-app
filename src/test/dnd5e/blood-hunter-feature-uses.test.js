import { describe, it, expect } from 'vitest'
import { defaultClassFeatureUses } from '../../systems/dnd5e/domain/rules'
import { BLOOD_HUNTER, bloodCursesKnown } from '../../systems/dnd5e/domain/bloodHunter'

function ficha(level) {
  return {
    info: { level, class: BLOOD_HUNTER, multiclasses: [] },
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 },
    combat: {},
  }
}

const maldito = level =>
  defaultClassFeatureUses(ficha(level)).find(u => u.id === 'cacador-de-sangue-blood-maledict')

describe('tracker de Sangue Maldito', () => {
  it('não existe no 1º nível — a feature só chega no 2º', () => {
    expect(maldito(1)).toBeUndefined()
  })

  it('escala os usos nos níveis 2, 6, 11 e 17', () => {
    expect(maldito(2).max).toBe(1)
    expect(maldito(5).max).toBe(1)
    expect(maldito(6).max).toBe(2)
    expect(maldito(10).max).toBe(2)
    expect(maldito(11).max).toBe(3)
    expect(maldito(16).max).toBe(3)
    expect(maldito(17).max).toBe(4)
    expect(maldito(20).max).toBe(4)
  })

  it('recupera em descanso curto ou longo', () => {
    const u = maldito(6)
    expect(u.recharge).toBe('short')
    expect(u.name).toBe('Sangue Maldito')
    expect(u.source).toBe(BLOOD_HUNTER)
    expect(u.used).toBe(0)
  })

  /**
   * Usos e maldições conhecidas escalam em níveis DIFERENTES (usos em 2/6/11/17,
   * maldições em 2/5/9/13/16/20). Confundir as duas colunas é o erro fácil aqui.
   */
  it('não confunde usos por descanso com maldições conhecidas', () => {
    expect(maldito(9).max).toBe(2)
    expect(bloodCursesKnown(9)).toBe(3)
    expect(maldito(20).max).toBe(4)
    expect(bloodCursesKnown(20)).toBe(6)
  })

  it('não emite o tracker para outra classe', () => {
    const mago = { info: { level: 10, class: 'mago', multiclasses: [] }, attributes: {}, combat: {} }
    expect(defaultClassFeatureUses(mago).find(u => u.id === 'cacador-de-sangue-blood-maledict'))
      .toBeUndefined()
  })
})
