import { describe, it, expect } from 'vitest'
import { looksRollable, findUncovered } from '../../scripts/gen-spell-mechanics.mjs'

describe('looksRollable', () => {
  it('detecta dados na prosa (desc e higher_level)', () => {
    expect(looksRollable({ desc: 'sofre 8d6 de dano de fogo', higher_level: '' })).toBe(true)
    expect(looksRollable({ desc: 'nada', higher_level: 'aumenta em 1d6' })).toBe(true)
  })
  it('detecta cura sem dado explicito? nao — so com dado ou "pontos de vida" com recupera', () => {
    expect(looksRollable({ desc: 'o alvo recupera 1d8 pontos de vida', higher_level: '' })).toBe(true)
    expect(looksRollable({ desc: 'voce fica invisivel', higher_level: '' })).toBe(false)
  })
})

describe('findUncovered', () => {
  const spells = [
    { index: 'a', desc: '2d6 de dano', higher_level: '' },
    { index: 'b', desc: '1d4 na arma do alvo', higher_level: '' },
    { index: 'c', desc: 'sem dados', higher_level: '' },
  ]
  it('aponta rolavel sem entrada e fora do _ignore', () => {
    expect(findUncovered(spells, { _ignore: ['b'] })).toEqual(['a'])
    expect(findUncovered(spells, { a: { damage: [] }, _ignore: ['b'] })).toEqual([])
  })
})
