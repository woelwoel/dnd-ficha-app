import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClassBlock } from '../components/CharacterWizardV2/blocks/ClassBlock'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const classes = [
  { index: 'guerreiro', name: 'Guerreiro', hit_die: 10, spellcasting_ability: '',
    saving_throws: ['Força', 'Constituição'],
    skill_choices: { count: 2, from: ['Atletismo'] },
  },
  { index: 'mago', name: 'Mago', hit_die: 6, spellcasting_ability: 'Inteligência',
    saving_throws: ['Inteligência', 'Sabedoria'],
  },
]

const classChoices = {
  guerreiro: { choices: [
    { id: 'fighting-style', level: 1, featureName: 'Estilo de Combate', prompt: '...', options: [
      { value: 'archery', name: 'Arqueirismo' },
      { value: 'defense', name: 'Defesa' },
    ]},
  ]},
}

const classProgression = {
  guerreiro: { levels: [
    { level: 1, features: [{ name: 'Estilo de Combate' }] },
    { level: 2, features: [] },
    { level: 4, features: [{ name: 'Aumento de Atributo' }] },
  ]},
}

describe('ClassBlock', () => {
  it('escolher classe atualiza draft com class + savingThrows + hitDice', async () => {
    const updateDraft = vi.fn()
    render(<ClassBlock draft={INITIAL_DRAFT_V2} updateDraft={updateDraft}
      classes={classes} classChoices={classChoices} classProgression={classProgression} feats={[]} />)
    await userEvent.selectOptions(screen.getByLabelText(/^classe/i), 'guerreiro')
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      class: 'guerreiro',
      hitDice: '1d10',
      savingThrows: expect.arrayContaining(['str', 'con']),
    }))
  })

  it('mostra ClassStatsCards quando classe escolhida', () => {
    render(<ClassBlock draft={{ ...INITIAL_DRAFT_V2, class: 'guerreiro' }} updateDraft={() => {}}
      classes={classes} classChoices={classChoices} classProgression={classProgression} feats={[]} />)
    expect(screen.getByText(/dado de vida/i)).toBeInTheDocument()
    expect(screen.getByText(/d10/i)).toBeInTheDocument()
  })

  it('mostra LevelProgressionList com choice do nível 1', () => {
    render(<ClassBlock draft={{ ...INITIAL_DRAFT_V2, class: 'guerreiro' }} updateDraft={() => {}}
      classes={classes} classChoices={classChoices} classProgression={classProgression} feats={[]} />)
    expect(screen.getByText(/estilo de combate/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /arqueirismo/i })).toBeInTheDocument()
  })

  it('mudar nível atualiza draft.level', async () => {
    const updateDraft = vi.fn()
    render(<ClassBlock draft={{ ...INITIAL_DRAFT_V2, class: 'guerreiro' }} updateDraft={updateDraft}
      classes={classes} classChoices={classChoices} classProgression={classProgression} feats={[]} />)
    await userEvent.selectOptions(screen.getByLabelText(/nível inicial/i), '4')
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({ level: 4 }))
  })

  it('mostra ClassEquipment quando classe escolhida', () => {
    render(<ClassBlock draft={{ ...INITIAL_DRAFT_V2, class: 'guerreiro' }} updateDraft={() => {}}
      classes={classes} classChoices={classChoices} classProgression={classProgression} feats={[]} />)
    expect(screen.getByText(/equipamento inicial/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /equipamento da classe/i })).toBeInTheDocument()
  })
})
