import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RaceBlock } from '../components/CharacterWizardV2/blocks/RaceBlock'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const races = [
  { index: 'anao', name: 'Anão',
    ability_bonuses: [{ ability: 'CON', bonus: 2 }],
    subraces: [{ index: 'anao-da-colina', name: 'Anão da Colina',
      ability_bonuses: [{ ability: 'SAB', bonus: 1 }] }],
  },
  { index: 'humano', name: 'Humano',
    ability_bonuses: [],
    optionalSubrace: true,
    subraces: [{ index: 'tracos-raciais-alternativos', name: 'Variante',
      ability_bonuses: [{ ability: '2 à escolha', bonus: 1 }] }],
  },
  { index: 'meio-elfo', name: 'Meio-Elfo',
    ability_bonuses: [
      { ability: 'CAR', bonus: 2 }, { ability: '2 à escolha', bonus: 1 },
    ], subraces: [],
  },
  { index: 'draconato', name: 'Draconato',
    ability_bonuses: [{ ability: 'FOR', bonus: 2 }, { ability: 'CAR', bonus: 1 }],
    subraces: [],
  },
  { index: 'elfo', name: 'Elfo', ability_bonuses: [{ ability: 'DES', bonus: 2 }],
    subraces: [{ index: 'alto-elfo', name: 'Alto Elfo',
      ability_bonuses: [{ ability: 'INT', bonus: 1 }] }],
  },
]

const empty = { ...INITIAL_DRAFT_V2 }

describe('RaceBlock', () => {
  it('escolher raça atualiza draft com race e racialBonuses', async () => {
    const updateDraft = vi.fn()
    render(<RaceBlock draft={empty} updateDraft={updateDraft} races={races} />)
    await userEvent.selectOptions(screen.getByLabelText(/^raça/i), 'anao')
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      race: 'anao',
      subrace: '',
      racialBonuses: { con: 2 },
      racialAbilityChoices: [],
      racialSkills: [],
      draconicAncestry: '',
      racialCantrip: '',
    }))
  })

  it('Draconato mostra DraconicAncestryPicker', () => {
    render(<RaceBlock draft={{ ...empty, race: 'draconato' }} updateDraft={() => {}} races={races} />)
    expect(screen.getByText(/ancestral dracônico/i)).toBeInTheDocument()
  })

  it('Alto Elfo mostra HighElfCantripPicker', () => {
    render(<RaceBlock draft={{ ...empty, race: 'elfo', subrace: 'alto-elfo' }} updateDraft={() => {}} races={races} />)
    expect(screen.getByText(/truque de mago/i)).toBeInTheDocument()
  })

  it('Meio-Elfo mostra FreeAbilityPicker (2 escolhas, exceto CHA) + RacialSkillPicker (2)', () => {
    render(<RaceBlock draft={{ ...empty, race: 'meio-elfo' }} updateDraft={() => {}} races={races} />)
    expect(screen.getByText(/escolha 2 atributos/i)).toBeInTheDocument()
    expect(screen.getByText(/escolha 2 perícias/i)).toBeInTheDocument()
  })

  it('Humano Variante mostra FreeAbilityPicker (2) + RacialSkillPicker (1)', () => {
    render(<RaceBlock
      draft={{ ...empty, race: 'humano', subrace: 'tracos-raciais-alternativos' }}
      updateDraft={() => {}} races={races} />)
    expect(screen.getByText(/escolha 2 atributos/i)).toBeInTheDocument()
    expect(screen.getByText(/escolha 1 perícia/i)).toBeInTheDocument()
  })

  it('preview mostra bônus de raça simples', () => {
    render(<RaceBlock draft={{ ...empty, race: 'anao' }} updateDraft={() => {}} races={races} />)
    expect(screen.getByText(/\+2 CON/i)).toBeInTheDocument()
  })
})
