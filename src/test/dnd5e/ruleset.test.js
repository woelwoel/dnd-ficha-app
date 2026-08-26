import { describe, it, expect } from 'vitest'
import { RULESETS, rulesetOf, is2024, byRuleset } from '../../systems/dnd5e/domain/ruleset'

describe('rulesetOf', () => {
  it('devolve 2024 quando a ficha carimba 2024', () => {
    expect(rulesetOf({ meta: { ruleset: '2024' } })).toBe('2024')
  })

  it('cai em 2014 para ficha legada (sem meta, sem campo, valor inválido)', () => {
    expect(rulesetOf({ meta: { ruleset: '2014' } })).toBe('2014')
    expect(rulesetOf({ meta: {} })).toBe('2014')
    expect(rulesetOf({})).toBe('2014')
    expect(rulesetOf(null)).toBe('2014')
    expect(rulesetOf(undefined)).toBe('2014')
    expect(rulesetOf({ meta: { ruleset: '2077' } })).toBe('2014')
    expect(rulesetOf({ meta: { ruleset: 2024 } })).toBe('2014')
  })
})

describe('is2024', () => {
  it('é verdadeiro só para ficha 2024', () => {
    expect(is2024({ meta: { ruleset: '2024' } })).toBe(true)
    expect(is2024({ meta: { ruleset: '2014' } })).toBe(false)
    expect(is2024({})).toBe(false)
  })
})

describe('byRuleset', () => {
  it('escolhe o ramo do ruleset da ficha', () => {
    const branches = { '2014': 'velho', '2024': 'novo' }
    expect(byRuleset({ meta: { ruleset: '2014' } }, branches)).toBe('velho')
    expect(byRuleset({ meta: { ruleset: '2024' } }, branches)).toBe('novo')
    expect(byRuleset({}, branches)).toBe('velho')
  })

  it('aceita ramo com valor falsy sem cair no outro', () => {
    expect(byRuleset({ meta: { ruleset: '2024' } }, { '2014': 1, '2024': 0 })).toBe(0)
  })

  it('lança quando falta um ramo — força responder "isso muda entre rulesets?"', () => {
    expect(() => byRuleset({}, { '2014': 'a' })).toThrow(/2024/)
    expect(() => byRuleset({}, { '2024': 'b' })).toThrow(/2014/)
  })

  it('RULESETS tem os dois códigos com rótulo em PT-BR', () => {
    expect(Object.keys(RULESETS)).toEqual(['2014', '2024'])
    expect(RULESETS['2024'].label).toMatch(/2024/)
  })
})
