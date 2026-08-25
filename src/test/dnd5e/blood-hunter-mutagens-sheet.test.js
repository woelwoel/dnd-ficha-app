import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCharacterCalculations } from '../../systems/dnd5e/hooks/useCharacterCalculations'
import { BLOOD_HUNTER, ORDER_CHOICE_ID } from '../../systems/dnd5e/domain/bloodHunter'
import { MUTANT, FORMULAS_CHOICE_ID } from '../../systems/dnd5e/domain/mutagens'

/** Nível 8 → nível de mutação 2, proficiência +3. */
function ficha({ ativos = [], order = MUTANT } = {}) {
  return {
    info: {
      name: 'T', class: BLOOD_HUNTER, level: 8, race: 'humano', multiclasses: [],
      chosenFeatures: {
        [ORDER_CHOICE_ID]: order,
        [FORMULAS_CHOICE_ID]: 'potencia,celeridade,sagacidade,rapidez,cautela,mobilidade',
      },
    },
    attributes: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
    combat: {
      maxHp: 60, currentHp: 60, tempHp: 0, armorClass: 15, speed: 9, activeEffects: [],
      mutagens: ativos, crimsonRites: [], hybridForm: false,
      concentrating: { spellIndex: null, spellName: null }, deathSaves: { successes: 0, failures: 0 },
    },
    proficiencies: { savingThrows: ['str', 'wis'], skills: [], expertiseSkills: [], armor: [] },
    spellcasting: { ability: null, usedSlots: {}, pactSlotsUsed: 0, spells: [] },
    inventory: { currency: {}, items: [] },
    traits: {},
  }
}

const calc = char => renderHook(() => useCharacterCalculations(char)).result.current

describe('mutagênicos na ficha — atributos', () => {
  it('sem mutagênico, os atributos são os da ficha', () => {
    const c = calc(ficha())
    expect(c.effectiveAttrs.str).toBe(16)
    expect(c.effectiveAttrs.dex).toBe(14)
  })

  it('Potência sobe Força e desce Destreza pelo nível de mutação', () => {
    const c = calc(ficha({ ativos: ['potencia'] }))
    expect(c.effectiveAttrs.str).toBe(18)
    expect(c.effectiveAttrs.dex).toBe(12)
  })

  /** Efeito colateral pode passar de 20, e o modificador tem de acompanhar. */
  it('o modificador derivado acompanha o atributo alterado', () => {
    const c = calc(ficha({ ativos: ['potencia'] }))
    expect(c.mods.str).toBe(4)
    expect(c.mods.dex).toBe(1)
  })

  it('Potência pode ultrapassar 20, porque a fórmula sobe o teto junto', () => {
    const char = ficha({ ativos: ['potencia'] })
    char.attributes.str = 20
    expect(calc(char).effectiveAttrs.str).toBe(22)
  })

  it('nunca desce um atributo abaixo de 1', () => {
    const char = ficha({ ativos: ['potencia'] })
    char.attributes.dex = 1
    expect(calc(char).effectiveAttrs.dex).toBe(1)
  })

  it('não altera nada para outra Ordem', () => {
    const c = calc(ficha({ ativos: ['potencia'], order: 'licantropo' }))
    expect(c.effectiveAttrs.str).toBe(16)
  })
})

describe('mutagênicos na ficha — CA, deslocamento e iniciativa', () => {
  it('Sagacidade reduz a CA efetiva e não a sugerida', () => {
    const normal = calc(ficha())
    const mutado = calc(ficha({ ativos: ['sagacidade'] }))
    expect(mutado.effectiveAC).toBe(normal.effectiveAC - 2)
    expect(mutado.suggestedAC).toBe(normal.suggestedAC)
  })

  it('Rapidez soma 4,5 metros ao deslocamento efetivo', () => {
    const normal = calc(ficha())
    expect(calc(ficha({ ativos: ['rapidez'] })).effectiveSpeed).toBe(normal.effectiveSpeed + 4.5)
  })

  it('Cautela soma e Mobilidade tira o dobro do nível de mutação na iniciativa', () => {
    const normal = calc(ficha()).initiative
    expect(calc(ficha({ ativos: ['cautela'] })).initiative).toBe(normal + 4)
    expect(calc(ficha({ ativos: ['mobilidade'] })).initiative).toBe(normal - 4)
  })

  /** Sagacidade sobe Sabedoria e derruba CA ao mesmo tempo. */
  it('aplica benefício e efeito colateral da mesma fórmula juntos', () => {
    const c = calc(ficha({ ativos: ['sagacidade'] }))
    expect(c.effectiveAttrs.wis).toBe(14)
    expect(c.effectiveAC).toBe(calc(ficha()).effectiveAC - 2)
  })
})
