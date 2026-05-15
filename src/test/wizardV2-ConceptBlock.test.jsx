import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConceptBlock } from '../components/CharacterWizardV2/blocks/ConceptBlock'

const emptyDraft = {
  name: '', playerName: '', alignment: '', appearance: '',
}

describe('ConceptBlock', () => {
  it('renderiza os 4 campos com valores do draft', () => {
    render(<ConceptBlock draft={{
      name: 'Heitor', playerName: 'Gabriel', alignment: 'Leal e Bom', appearance: 'alto',
    }} updateDraft={() => {}} />)
    expect(screen.getByLabelText(/nome do personagem/i)).toHaveValue('Heitor')
    expect(screen.getByLabelText(/nome do jogador/i)).toHaveValue('Gabriel')
    expect(screen.getByLabelText(/alinhamento/i)).toHaveValue('Leal e Bom')
    expect(screen.getByLabelText(/aparência/i)).toHaveValue('alto')
  })

  it('updateDraft é chamado ao digitar nome', async () => {
    const updateDraft = vi.fn()
    render(<ConceptBlock draft={emptyDraft} updateDraft={updateDraft} />)
    await userEvent.type(screen.getByLabelText(/nome do personagem/i), 'A')
    expect(updateDraft).toHaveBeenCalledWith({ name: 'A' })
  })

  it('updateDraft é chamado ao mudar alinhamento', async () => {
    const updateDraft = vi.fn()
    render(<ConceptBlock draft={emptyDraft} updateDraft={updateDraft} />)
    await userEvent.selectOptions(screen.getByLabelText(/alinhamento/i), 'Caótico e Bom')
    expect(updateDraft).toHaveBeenCalledWith({ alignment: 'Caótico e Bom' })
  })

  it('mostra hint de obrigatório quando nome está vazio', () => {
    render(<ConceptBlock draft={emptyDraft} updateDraft={() => {}} />)
    expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument()
  })

  it('NÃO mostra hint quando nome está preenchido', () => {
    render(<ConceptBlock draft={{ ...emptyDraft, name: 'Heitor' }} updateDraft={() => {}} />)
    expect(screen.queryByText(/nome é obrigatório/i)).not.toBeInTheDocument()
  })
})
