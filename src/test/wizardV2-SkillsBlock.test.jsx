import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SkillsBlock } from '../components/CharacterWizardV2/blocks/SkillsBlock'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const classData = {
  skill_choices: { count: 2, from: ['Atletismo', 'História', 'Percepção', 'Intimidação'] },
}

const empty = INITIAL_DRAFT_V2

// SKILLS keys are English slugs: athletics, history, perception, intimidation

describe('SkillsBlock', () => {
  it('mostra contador 0/2', () => {
    render(<SkillsBlock draft={empty} updateDraft={() => {}} classData={classData} />)
    expect(screen.getByText(/0\/2/)).toBeInTheDocument()
  })

  it('clicar perícia da classe adiciona a chosenSkills', async () => {
    const updateDraft = vi.fn()
    render(<SkillsBlock draft={empty} updateDraft={updateDraft} classData={classData} />)
    const atletismo = screen.getByText(/^Atletismo$/i).closest('div')
    await userEvent.click(atletismo)
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      chosenSkills: expect.arrayContaining(['athletics']),
    }))
  })

  it('NÃO permite adicionar mais que o limite', async () => {
    const updateDraft = vi.fn()
    const draft = { ...empty, chosenSkills: ['athletics', 'history'] }
    render(<SkillsBlock draft={draft} updateDraft={updateDraft} classData={classData} />)
    const percepcao = screen.getByText(/^Percepção$/i).closest('div')
    await userEvent.click(percepcao)
    expect(updateDraft).not.toHaveBeenCalled()
  })

  it('mostra 🎒 pra perícias do antecedente', () => {
    const draft = { ...empty, backgroundSkills: ['athletics'] }
    render(<SkillsBlock draft={draft} updateDraft={() => {}} classData={classData} />)
    expect(screen.getAllByText(/🎒/).length).toBeGreaterThan(0)
  })

  it('perícia do antecedente não conta pro limite', () => {
    const draft = { ...empty, backgroundSkills: ['athletics'] }
    render(<SkillsBlock draft={draft} updateDraft={() => {}} classData={classData} />)
    expect(screen.getByText(/0\/2/)).toBeInTheDocument()
  })

  it('toggle remove perícia já selecionada', async () => {
    const updateDraft = vi.fn()
    const draft = { ...empty, chosenSkills: ['athletics'] }
    render(<SkillsBlock draft={draft} updateDraft={updateDraft} classData={classData} />)
    const atletismo = screen.getByText(/^Atletismo$/i).closest('div')
    await userEvent.click(atletismo)
    expect(updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      chosenSkills: [],
    }))
  })
})
