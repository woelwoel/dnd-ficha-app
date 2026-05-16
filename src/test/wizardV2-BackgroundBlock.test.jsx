import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BackgroundBlock } from '../components/CharacterWizardV2/blocks/BackgroundBlock'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const backgrounds = [
  { index: 'soldado', name: 'Soldado',
    skill_proficiencies: ['Atletismo', 'Intimidação'],
    tool_proficiencies: ['Jogos'],
    languages: '',
    equipment: 'Insígnia militar; 10 PO',
    description: 'Servi nas forças armadas',
  },
  { index: 'sabio', name: 'Sábio',
    skill_proficiencies: ['Arcanismo', 'História'],
    languages: '2 idiomas à sua escolha',
    equipment: 'Pergaminho; 10 PO',
  },
]

const empty = INITIAL_DRAFT_V2

// SKILLS keys are English slugs: athletics, intimidation, history, arcana, perception

describe('BackgroundBlock', () => {
  it('escolher antecedente atualiza draft', async () => {
    const updateDraft = vi.fn()
    render(<BackgroundBlock draft={empty} updateDraft={updateDraft} backgrounds={backgrounds} />)
    await userEvent.selectOptions(screen.getByLabelText(/^antecedente/i), 'soldado')
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      background: 'soldado',
      backgroundSkills: expect.arrayContaining(['athletics', 'intimidation']),
    }))
  })

  it('mostra perícias concedidas quando antecedente preenchido', () => {
    const draft = { ...empty, background: 'soldado', backgroundSkills: ['athletics', 'intimidation'] }
    render(<BackgroundBlock draft={draft} updateDraft={() => {}} backgrounds={backgrounds} />)
    expect(screen.getByText(/perícias concedidas/i)).toBeInTheDocument()
    expect(screen.getByText(/atletismo/i)).toBeInTheDocument()
    expect(screen.getByText(/intimidação/i)).toBeInTheDocument()
  })

  it('mostra ferramentas, idiomas, equipamento', () => {
    const draft = { ...empty, background: 'sabio', backgroundSkills: ['arcana'] }
    render(<BackgroundBlock draft={draft} updateDraft={() => {}} backgrounds={backgrounds} />)
    expect(screen.getAllByText(/idiomas/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/2 idiomas/i)).toBeInTheDocument()
    expect(screen.getByText(/equipamento/i)).toBeInTheDocument()
  })

  it('NÃO mostra preview quando background vazio', () => {
    render(<BackgroundBlock draft={empty} updateDraft={() => {}} backgrounds={backgrounds} />)
    expect(screen.queryByText(/perícias concedidas/i)).not.toBeInTheDocument()
  })

  it('remove chosenSkills duplicadas com bg ao mudar antecedente', async () => {
    const updateDraft = vi.fn()
    const draft = { ...empty, chosenSkills: ['athletics', 'history'] }
    render(<BackgroundBlock draft={draft} updateDraft={updateDraft} backgrounds={backgrounds} />)
    await userEvent.selectOptions(screen.getByLabelText(/^antecedente/i), 'soldado')
    const call = updateDraft.mock.calls[0][0]
    expect(call.chosenSkills).not.toContain('athletics')
    expect(call.chosenSkills).toContain('history')
  })
})
