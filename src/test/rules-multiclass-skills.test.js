import { describe, it, expect } from 'vitest'
import { addMulticlass } from '../systems/dnd5e/domain/rules'

function makeCharacter(overrides = {}) {
  return {
    meta: { settings: { allowMulticlass: true } },
    attributes: { str: 14, dex: 14, con: 13, int: 10, wis: 12, cha: 15 },
    info: { class: 'guerreiro', level: 3, multiclasses: [], chosenFeatures: {} },
    proficiencies: {
      skills: ['athletics', 'intimidation'],
      backgroundSkills: ['perception'],
      armor: ['leve', 'media', 'escudos'],
      weapons: ['simples', 'marciais'],
      tools: [],
    },
    combat: { hitDice: { pool: { d10: { total: 3, used: 0 } } } },
    spellcasting: { abilitiesByClass: {} },
    ...overrides,
  }
}

describe('addMulticlass — captura de perícia (PHB p.164)', () => {
  it('grava a(s) perícia(s) escolhida(s) em proficiencies.skills', () => {
    const prev = makeCharacter()
    const result = addMulticlass(prev, {
      classIndex: 'ladino',
      proficiencies: { armor: ['leve'], weapons: [], tools: ['ferramentas de ladrão'], skills: 1 },
      chosenSkills: ['stealth'],
    })
    expect(result.ok).toBe(true)
    expect(result.character.proficiencies.skills).toContain('stealth')
    // preserva as perícias anteriores
    expect(result.character.proficiencies.skills).toEqual(
      expect.arrayContaining(['athletics', 'intimidation', 'stealth'])
    )
  })

  it('faz dedupe se a perícia já era proficiente', () => {
    const prev = makeCharacter()
    const result = addMulticlass(prev, {
      classIndex: 'ladino',
      proficiencies: { skills: 1 },
      chosenSkills: ['athletics'], // já possuída
    })
    const athleticsCount = result.character.proficiencies.skills.filter(s => s === 'athletics').length
    expect(athleticsCount).toBe(1)
  })

  it('mescla também armadura/arma/ferramenta (comportamento existente)', () => {
    const prev = makeCharacter()
    const result = addMulticlass(prev, {
      classIndex: 'ladino',
      proficiencies: { armor: ['leve'], weapons: [], tools: ['ferramentas de ladrão'], skills: 1 },
      chosenSkills: ['stealth'],
    })
    expect(result.character.proficiencies.tools).toContain('ferramentas de ladrão')
    expect(result.character.proficiencies.armor).toContain('leve')
  })

  it('sem chosenSkills mantém as perícias anteriores intactas', () => {
    const prev = makeCharacter()
    const result = addMulticlass(prev, {
      classIndex: 'mago',
      proficiencies: { armor: [], weapons: [], tools: [], skills: 0 },
    })
    expect(result.character.proficiencies.skills).toEqual(['athletics', 'intimidation'])
  })
})
