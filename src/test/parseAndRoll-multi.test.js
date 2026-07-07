import { describe, it, expect } from 'vitest'
import { parseAndRoll } from '../hooks/useDiceRoller'

describe('parseAndRoll — compat de um termo', () => {
  it('mantem o shape atual (sem groups obrigatorio pros consumidores)', () => {
    const r = parseAndRoll('2d6+3')
    expect(r.rolls).toHaveLength(2)
    expect(r.sides).toBe(6)
    expect(r.modifier).toBe(3)
    expect(r.total).toBe(r.rolls[0] + r.rolls[1] + 3)
  })
  it('modificador puro continua igual', () => {
    expect(parseAndRoll('5')).toMatchObject({ rolls: [], modifier: 5, total: 5, sides: null })
  })
  it('notacao invalida → null', () => {
    expect(parseAndRoll('banana')).toBeNull()
    expect(parseAndRoll('1d20+abc')).toBeNull()
  })
})

describe('parseAndRoll — multi-termo (riders)', () => {
  it('1d20+1d4+5: grupo principal = d20; groups tem os dois; total soma tudo', () => {
    const r = parseAndRoll('1d20+1d4+5')
    expect(r.sides).toBe(20)
    expect(r.rolls).toHaveLength(1)
    expect(r.groups).toHaveLength(2)
    expect(r.groups[0]).toMatchObject({ sides: 20 })
    expect(r.groups[1]).toMatchObject({ sides: 4 })
    expect(r.groups[1].rolls[0]).toBeGreaterThanOrEqual(1)
    expect(r.groups[1].rolls[0]).toBeLessThanOrEqual(4)
    expect(r.modifier).toBe(5)
    expect(r.total).toBe(r.rolls[0] + r.groups[1].rolls[0] + 5)
  })
  it('vantagem aplica SO no primeiro grupo 1d20', () => {
    const r = parseAndRoll('1d20+1d4', { mode: 'adv' })
    expect(r.allRolls).toHaveLength(2)
    expect(r.rolls).toHaveLength(1)
    expect(r.groups[1].rolls).toHaveLength(1)
    expect(r.total).toBe(r.rolls[0] + r.groups[1].rolls[0])
  })
  it('nat 20 continua detectavel por sides/rolls[0]', () => {
    for (let i = 0; i < 50; i++) {
      const r = parseAndRoll('1d20+1d4+2')
      expect(r.rolls[0]).toBeGreaterThanOrEqual(1)
      expect(r.rolls[0]).toBeLessThanOrEqual(20)
    }
  })
  it('multiplos riders: 1d20+1d4+1d4', () => {
    const r = parseAndRoll('1d20+1d4+1d4')
    expect(r.groups).toHaveLength(3)
  })
})
