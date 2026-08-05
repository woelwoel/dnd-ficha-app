import { describe, it, expect } from 'vitest'
import { RULESETS, rulesetOf, rulesetFor, sourcesFor } from '../../systems/dnd5e/domain/rulesets'

describe('RULESETS — descritor', () => {
  it('2014 concede atributo pela raça e não tem nível de subclasse uniforme', () => {
    expect(RULESETS['2014'].abilityBonusFrom).toBe('race')
    expect(RULESETS['2014'].backgroundGrantsFeat).toBe(false)
    expect(RULESETS['2014'].subclassLevel).toBe(null)
  })
  it('2024 concede atributo pelo antecedente, com talento de origem e subclasse no 3', () => {
    expect(RULESETS['2024'].abilityBonusFrom).toBe('background')
    expect(RULESETS['2024'].backgroundGrantsFeat).toBe('origem')
    expect(RULESETS['2024'].subclassLevel).toBe(3)
  })
  it('as fontes de cada geração não se cruzam', () => {
    const a = new Set(RULESETS['2014'].sources)
    expect(RULESETS['2024'].sources.some(s => a.has(s))).toBe(false)
  })
})

describe('rulesetOf', () => {
  it('ficha legada sem ruleset é 2014', () => {
    expect(rulesetOf({ meta: { settings: {} } })).toBe('2014')
    expect(rulesetOf({})).toBe('2014')
    expect(rulesetOf(null)).toBe('2014')
  })
  it('lê o ruleset declarado na ficha', () => {
    expect(rulesetOf({ meta: { settings: { ruleset: '2024' } } })).toBe('2024')
  })
})

describe('rulesetFor', () => {
  it('devolve o descritor da ficha', () => {
    expect(rulesetFor({ meta: { settings: { ruleset: '2024' } } }).id).toBe('2024')
  })
  it('valor desconhecido cai no descritor 2014 (o schema é quem reprova)', () => {
    expect(rulesetFor({ meta: { settings: { ruleset: 'xpto' } } }).id).toBe('2014')
  })
})

describe('sourcesFor — gating estrito', () => {
  it('2014 mantém as fontes ligadas pelo jogador', () => {
    const c = { meta: { settings: { sources: ['phb', 'tasha'] } } }
    expect(sourcesFor(c)).toEqual(['phb', 'tasha'])
  })
  it('2024 descarta fonte 2014 mesmo se persistida na ficha', () => {
    const c = { meta: { settings: { ruleset: '2024', sources: ['phb', 'tasha', 'phb2024'] } } }
    expect(sourcesFor(c)).toEqual(['phb2024'])
  })
  it('ficha 2024 sem sources recebe a fonte base da geração', () => {
    const c = { meta: { settings: { ruleset: '2024' } } }
    expect(sourcesFor(c)).toEqual(['phb2024'])
  })
})
