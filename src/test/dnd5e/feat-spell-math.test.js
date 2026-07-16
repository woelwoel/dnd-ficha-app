import { describe, it, expect } from 'vitest'
import { getSpellMathForSpell } from '../../systems/dnd5e/utils/spellcasting'

describe('getSpellMathForSpell', () => {
  const attrs = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 16 }

  it('usa spell.ability quando presente (Guerreiro + Tocado pelas Fadas: CD sai de CAR)', () => {
    expect(getSpellMathForSpell({ ability: 'cha' }, attrs, 2, null))
      .toEqual({ ability: 'cha', mod: 3, save: 13, attack: 5 })
  })

  it('spell.ability vence o atributo global', () => {
    expect(getSpellMathForSpell({ ability: 'cha' }, attrs, 2, 'int').ability).toBe('cha')
  })

  it('sem spell.ability cai no atributo global', () => {
    expect(getSpellMathForSpell({}, attrs, 2, 'int'))
      .toEqual({ ability: 'int', mod: 0, save: 10, attack: 2 })
  })

  it('sem atributo nenhum → null (não-conjurador sem magia de talento)', () => {
    expect(getSpellMathForSpell({}, attrs, 2, null)).toBeNull()
  })

  it('atributo ausente do mapa → score 10', () => {
    expect(getSpellMathForSpell({ ability: 'wis' }, {}, 3, null))
      .toEqual({ ability: 'wis', mod: 0, save: 11, attack: 3 })
  })

  it('modificador negativo (atributo baixo)', () => {
    expect(getSpellMathForSpell({ ability: 'str' }, { str: 7 }, 2, null))
      .toEqual({ ability: 'str', mod: -2, save: 8, attack: 0 })
  })

  it('spell null/undefined não explode', () => {
    expect(getSpellMathForSpell(null, attrs, 2, 'cha')).toEqual({ ability: 'cha', mod: 3, save: 13, attack: 5 })
    expect(getSpellMathForSpell(undefined, attrs, 2, null)).toBeNull()
  })
})
