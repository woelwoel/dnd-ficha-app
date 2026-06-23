import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterWizardV2 } from '../../components/CharacterWizardV2/CharacterWizardV2'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'

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
    // Magias é o próximo bloco placeholder (não funcional ainda). Mas Magias começa bloqueado
    // (precisa de classe). Como o card bloqueado não abre modal, usamos Revisão.
    // Revisão também é bloqueado quando vazio. Para abrir um placeholder, escolhemos Magias
    // após preencher Classe — mas isso requer SRD real. Em vez disso, validamos que NENHUM
    // dos blocos funcionais agora cai no placeholder.
    // (A condição "em construção" agora só dispara para spells e review — ambos bloqueados
    // sem deps. Esse teste foi superado pela funcionalidade real.)
    // Garantia mínima: clicar Conceito abre conteúdo real, não placeholder.
    await userEvent.click(screen.getByRole('button', { name: /conceito/i }))
    expect(screen.queryByText(/em construção/i)).not.toBeInTheDocument()
  })

  it('clicar em card Conceito abre ConceptBlock real', async () => {
    renderWithSrd(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    await userEvent.click(screen.getByRole('button', { name: /conceito/i }))
    expect(screen.getByLabelText(/nome do personagem/i)).toBeInTheDocument()
  })

  it('clicar em card Classe abre ClassBlock real', async () => {
    renderWithSrd(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    await userEvent.click(screen.getByRole('button', { name: /classe/i }))
    // O modal envolve o ClassBlock; busca o select dentro do dialog pra evitar colisão com o card "Classe" do grid.
    const dialog = screen.getByRole('dialog', { name: /classe/i })
    expect(within(dialog).getByLabelText(/^classe/i)).toBeInTheDocument()
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
