import { describe, it, expect } from 'vitest'
import { buildCharacter } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'
import { INITIAL_DRAFT_V2 } from '../../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'

const draft = (over) => ({
  ...INITIAL_DRAFT_V2, name: 'L', class: 'guerreiro', level: 1,
  baseAttributes: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }, savingThrows: ['str', 'con'], ...over,
})
const guerreiro = { index: 'guerreiro', hit_die: 10, spellcasting_ability: '' }

describe('build — troca de idioma (Customizando sua Origem)', () => {
  it('substitui o idioma fixo pelo escolhido', () => {
    const c = buildCharacter(draft({ race: 'anao', settings: { flexibleRacialAsi: true }, racialLanguageOverride: { 'Anão': 'Dracônico' } }), guerreiro, {})
    expect(c.proficiencies.languages).toContain('Comum')
    expect(c.proficiencies.languages).toContain('Dracônico')
    expect(c.proficiencies.languages).not.toContain('Anão')
  })
  it('sem override (ou toggle off): mantém os idiomas fixos', () => {
    const c = buildCharacter(draft({ race: 'anao' }), guerreiro, {})
    expect(c.proficiencies.languages).toEqual(expect.arrayContaining(['Comum', 'Anão']))
  })
  it('toggle off ignora override mesmo se presente', () => {
    const c = buildCharacter(draft({ race: 'anao', racialLanguageOverride: { 'Anão': 'Dracônico' } }), guerreiro, {})
    expect(c.proficiencies.languages).toContain('Anão')
    expect(c.proficiencies.languages).not.toContain('Dracônico')
  })
})
