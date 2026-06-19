import { describe, it, expect } from 'vitest'
import { getEffectiveSaveProficiencies, classLevel } from '../domain/rules'

function char(info, savingThrows = ['dex']) {
  return { info, proficiencies: { savingThrows } }
}

describe('classLevel', () => {
  it('soma classe primária + multiclasses da mesma classe', () => {
    const c = char({ class: 'monge', level: 10, multiclasses: [{ class: 'monge', level: 0 }] })
    expect(classLevel(c, 'monge')).toBe(10)
  })
  it('conta níveis de multiclasse', () => {
    const c = char({ class: 'guerreiro', level: 6, multiclasses: [{ class: 'monge', level: 8 }] })
    expect(classLevel(c, 'monge')).toBe(8)
  })
})

describe('getEffectiveSaveProficiencies — Alma de Diamante (PHB p.79)', () => {
  it('Monge < 14: mantém só as salvaguardas da classe', () => {
    const c = char({ class: 'monge', level: 13, multiclasses: [] }, ['str', 'dex'])
    expect(getEffectiveSaveProficiencies(c).sort()).toEqual(['dex', 'str'])
  })
  it('Monge 14+: proficiência em TODAS as salvaguardas', () => {
    const c = char({ class: 'monge', level: 14, multiclasses: [] }, ['str', 'dex'])
    expect(getEffectiveSaveProficiencies(c).sort()).toEqual(['cha', 'con', 'dex', 'int', 'str', 'wis'])
  })
  it('Monge 14 via multiclasse também conta', () => {
    const c = char({ class: 'guerreiro', level: 2, multiclasses: [{ class: 'monge', level: 14 }] }, ['str', 'con'])
    expect(getEffectiveSaveProficiencies(c)).toHaveLength(6)
  })
  it('não-Monge: inalterado', () => {
    const c = char({ class: 'guerreiro', level: 20, multiclasses: [] }, ['str', 'con'])
    expect(getEffectiveSaveProficiencies(c).sort()).toEqual(['con', 'str'])
  })
})
