import { describe, it, expect } from 'vitest'
import { buildNotation, clampCount, parseMod, QUICK_ROLL_SIDES } from '../components/DiceRoller/quickRoll'

describe('QUICK_ROLL_SIDES', () => {
  it('oferece só lados que a lib 3D sabe animar', () => {
    expect(QUICK_ROLL_SIDES).toEqual([4, 6, 8, 10, 12, 20, 100])
  })
})

describe('buildNotation', () => {
  it('omite o modificador quando é zero', () => {
    expect(buildNotation({ count: 1, sides: 20, mod: 0 })).toBe('1d20')
  })

  it('soma modificador positivo com sinal explícito', () => {
    expect(buildNotation({ count: 3, sides: 6, mod: 2 })).toBe('3d6+2')
  })

  it('mantém o sinal do modificador negativo', () => {
    expect(buildNotation({ count: 2, sides: 8, mod: -1 })).toBe('2d8-1')
  })

  it('prende a quantidade antes de montar', () => {
    expect(buildNotation({ count: 99, sides: 6, mod: 0 })).toBe('20d6')
  })
})

describe('clampCount', () => {
  it('prende no mínimo 1', () => {
    expect(clampCount(0)).toBe(1)
    expect(clampCount(-5)).toBe(1)
  })

  it('prende no máximo 20', () => {
    expect(clampCount(21)).toBe(20)
    expect(clampCount(999)).toBe(20)
  })

  it('devolve o mínimo para texto vazio ou lixo', () => {
    expect(clampCount('')).toBe(1)
    expect(clampCount('abc')).toBe(1)
  })

  it('trunca decimal', () => {
    expect(clampCount(3.7)).toBe(3)
  })
})

describe('parseMod', () => {
  it('trata vazio como zero', () => {
    expect(parseMod('')).toBe(0)
    expect(parseMod('   ')).toBe(0)
  })

  it('aceita o + explícito', () => {
    expect(parseMod('+2')).toBe(2)
  })

  it('aceita negativo', () => {
    expect(parseMod('-1')).toBe(-1)
  })

  it('trata lixo como zero', () => {
    expect(parseMod('x')).toBe(0)
  })
})
