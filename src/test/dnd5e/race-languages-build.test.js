import { describe, it, expect } from 'vitest'
import { buildCharacter } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'
import { INITIAL_DRAFT_V2 } from '../../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'

const baseDraft = (over = {}) => ({
  ...INITIAL_DRAFT_V2, name: 'L', class: 'guerreiro', level: 1,
  baseAttributes: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
  savingThrows: ['str', 'con'], ...over,
})
const guerreiro = { index: 'guerreiro', hit_die: 10, spellcasting_ability: '' }

describe('build — idiomas da raça', () => {
  it('Anão recebe Comum + Anão em proficiencies.languages', () => {
    const c = buildCharacter(baseDraft({ race: 'anao' }), guerreiro, {})
    expect(c.proficiencies.languages).toEqual(expect.arrayContaining(['Comum', 'Anão']))
  })
  it('Humano recebe Comum + o idioma extra escolhido', () => {
    const c = buildCharacter(baseDraft({ race: 'humano', racialLanguages: ['Élfico'] }), guerreiro, {})
    expect(c.proficiencies.languages).toEqual(expect.arrayContaining(['Comum', 'Élfico']))
  })
  it('raça sem dados de idioma não quebra (lista vazia)', () => {
    const c = buildCharacter(baseDraft({ race: 'inexistente' }), guerreiro, {})
    expect(Array.isArray(c.proficiencies.languages)).toBe(true)
  })
})
