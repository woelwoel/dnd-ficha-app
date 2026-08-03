import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildNotation,
  clampCount,
  parseMod,
  QUICK_ROLL_SIDES,
  readQuickRollPref,
  writeQuickRollPref,
  QUICK_ROLL_KEY,
} from '../components/DiceRoller/quickRoll'
import { parseAndRoll } from '../hooks/useDiceRoller'
import { DICE3D_SIDES } from '../components/DiceRoller/dice3d'

describe('QUICK_ROLL_SIDES', () => {
  it('oferece só lados que a lib 3D sabe animar', () => {
    expect(QUICK_ROLL_SIDES).toEqual([4, 6, 8, 10, 12, 20, 100])
  })

  it('bate com DICE3D_SIDES — se a lib 3D mudar os lados suportados, este teste acusa', () => {
    expect(QUICK_ROLL_SIDES).toEqual(Array.from(DICE3D_SIDES))
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

  it('normaliza mod string "0" — não deixa concatenar sem sinal', () => {
    // Bug real: '0' é truthy em JS, então o guard `!mod` sozinho não pega.
    // '3d6' + '0' viraria '3d60' (um d60!) sem passar por parseMod antes.
    expect(buildNotation({ count: 1, sides: 20, mod: '0' })).toBe('1d20')
  })

  it('usa o padrão mod=0 quando a chave não é passada', () => {
    expect(buildNotation({ count: 2, sides: 6 })).toBe('2d6')
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

  it('devolve o mínimo para null/undefined', () => {
    expect(clampCount(null)).toBe(1)
    expect(clampCount(undefined)).toBe(1)
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

  it('trunca decimal (Math.trunc já cobre — documentando o comportamento)', () => {
    expect(parseMod('2.7')).toBe(2)
  })
})

describe('buildNotation + parseAndRoll (integração com o motor real)', () => {
  it('1d20 padrão é aceito e rola um d20', () => {
    const notation = buildNotation({ count: 1, sides: 20, mod: 0 })
    expect(notation).toBe('1d20')
    const result = parseAndRoll(notation)
    expect(result).not.toBeNull()
    expect(result.sides).toBe(20)
    expect(result.count).toBe(1)
  })

  it('3d6+2 é aceito e rola 3 dados de 6 lados com modificador 2', () => {
    const notation = buildNotation({ count: 3, sides: 6, mod: 2 })
    expect(notation).toBe('3d6+2')
    const result = parseAndRoll(notation)
    expect(result).not.toBeNull()
    expect(result.sides).toBe(6)
    expect(result.count).toBe(3)
    expect(result.modifier).toBe(2)
  })

  it('2d8-1 é aceito e rola 2 dados de 8 lados com modificador -1', () => {
    const notation = buildNotation({ count: 2, sides: 8, mod: -1 })
    expect(notation).toBe('2d8-1')
    const result = parseAndRoll(notation)
    expect(result).not.toBeNull()
    expect(result.sides).toBe(8)
    expect(result.count).toBe(2)
    expect(result.modifier).toBe(-1)
  })

  it('mod "0" (string) — caso que originou o bug: precisa render 1d20 e rolar d20, não d200', () => {
    const notation = buildNotation({ count: 1, sides: 20, mod: '0' })
    expect(notation).toBe('1d20')
    const result = parseAndRoll(notation)
    expect(result).not.toBeNull()
    expect(result.sides).toBe(20)
  })
})

describe('preferência persistida', () => {
  beforeEach(() => {
    window.localStorage.removeItem(QUICK_ROLL_KEY)
  })

  it('sem nada guardado, devolve d20 x1 sem modificador', () => {
    expect(readQuickRollPref()).toEqual({ sides: 20, count: 1, mod: 0 })
  })

  it('lê de volta o que gravou', () => {
    writeQuickRollPref({ sides: 6, count: 8, mod: -1 })
    expect(readQuickRollPref()).toEqual({ sides: 6, count: 8, mod: -1 })
  })

  it('JSON corrompido cai no padrão', () => {
    window.localStorage.setItem(QUICK_ROLL_KEY, '{isso não é json')
    expect(readQuickRollPref()).toEqual({ sides: 20, count: 1, mod: 0 })
  })

  it('lado desconhecido cai no d20', () => {
    window.localStorage.setItem(QUICK_ROLL_KEY, JSON.stringify({ sides: 7, count: 2, mod: 0 }))
    expect(readQuickRollPref().sides).toBe(20)
  })

  it('quantidade fora da faixa é presa na leitura', () => {
    window.localStorage.setItem(QUICK_ROLL_KEY, JSON.stringify({ sides: 6, count: 999, mod: 0 }))
    expect(readQuickRollPref().count).toBe(20)
  })
})
