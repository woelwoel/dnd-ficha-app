import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterWizardV2 } from '../../components/CharacterWizardV2/CharacterWizardV2'
import { SrdProvider } from '../../providers/SrdProvider'

function renderWithSrd(ui) {
  return render(<SrdProvider>{ui}</SrdProvider>)
}

describe('E2E — CharacterWizardV2 shell', () => {
  beforeEach(() => sessionStorage.clear())

  it('abre setup modal ao montar sem draft salvo', () => {
    renderWithSrd(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    expect(screen.getByRole('dialog', { name: /configuração da campanha/i })).toBeInTheDocument()
  })

  it('confirmar setup leva ao grid com 8 cards', async () => {
    renderWithSrd(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    // grid renderiza os 8 labels
    for (const label of ['Raça', 'Classe', 'Antecedente', 'Atributos', 'Perícias', 'Magias', 'Conceito', 'Revisão']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('clicar em card de bloco ainda placeholder mostra "em construção"', async () => {
    renderWithSrd(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    await userEvent.click(screen.getByRole('button', { name: /antecedente/i }))
    expect(screen.getByText(/em construção/i)).toBeInTheDocument()
  })

  it('clicar em card Conceito abre ConceptBlock real', async () => {
    renderWithSrd(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    await userEvent.click(screen.getByRole('button', { name: /conceito/i }))
    expect(screen.getByLabelText(/nome do personagem/i)).toBeInTheDocument()
  })

  it('mostra ResumeDraftPrompt se sessionStorage tem draft', () => {
    sessionStorage.setItem('wizard-v2-draft', JSON.stringify({ name: 'Salvo' }))
    renderWithSrd(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    expect(screen.getByText(/continuar personagem em construção/i)).toBeInTheDocument()
  })

  it('botão Inscrever Herói está desabilitado em PR 1 (review nunca completo aqui)', async () => {
    renderWithSrd(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    expect(screen.getByRole('button', { name: /inscrever herói/i })).toBeDisabled()
  })

  it('voltar sem mudanças chama onBack direto', async () => {
    const onBack = vi.fn()
    renderWithSrd(<CharacterWizardV2 onBack={onBack} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    await userEvent.click(screen.getByRole('button', { name: /personagens/i }))
    expect(onBack).toHaveBeenCalled()
  })
})
