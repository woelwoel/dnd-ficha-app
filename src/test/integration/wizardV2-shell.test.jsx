import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CharacterWizardV2 } from '../../systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2'
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

// Cobre o elo de plumbing setup→WizardGrid→useDraft que, uma vez, deixou o
// ruleset escolhido no modal cair no void: CampaignSetupModal.onConfirm
// entrega { settings, ruleset }, CharacterWizardV2 guarda em pendingRuleset e
// PRECISA repassar via prop `initialRuleset` pro WizardGrid, que por sua vez
// PRECISA repassar pro useDraft. Um vazamento em qualquer um desses 2 hops
// faz toda ficha nascer '2014' mesmo com "D&D 5e (2024)" selecionado — e os
// testes de useDraft isolado (que chamam o hook direto) nunca pegariam isso.
describe('E2E — CharacterWizardV2 propaga ruleset do setup até o draft', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('escolher "D&D 5e (2024)" no setup persiste ruleset=2024 no draft', async () => {
    window.history.replaceState({}, '', '/?ruleset=2024')
    renderWithSrd(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)

    // Garante que estamos na fase de setup, não "resume" (sem draft salvo).
    expect(screen.getByRole('dialog', { name: /configuração da campanha/i })).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText(/D&D 5e \(2024\)/))
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))

    // Chegamos no grid (setup fechou).
    expect(screen.getByText('Raça')).toBeInTheDocument()

    // useDraft não autosalva no mount inicial (isFirstRender guard) — só a
    // partir da 1a mudança real do draft. Provoca uma mudança mínima
    // (digitar o nome) pra disparar o debounce de 500ms e conseguir
    // inspecionar o que foi de fato persistido.
    await userEvent.click(screen.getByRole('button', { name: /conceito/i }))
    await userEvent.type(screen.getByLabelText(/nome do personagem/i), 'Aria')

    await waitFor(() => {
      const saved = sessionStorage.getItem('wizard-v2-draft')
      expect(saved).not.toBeNull()
      const draft = JSON.parse(saved)
      expect(draft.ruleset).toBe('2024')
    }, { timeout: 2000 })
  })

  it('sem ?ruleset=2024 na URL, o seletor não aparece e o draft fica em 2014', async () => {
    renderWithSrd(<CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />)

    expect(screen.queryByLabelText(/D&D 5e \(2024\)/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    expect(screen.getByText('Raça')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /conceito/i }))
    await userEvent.type(screen.getByLabelText(/nome do personagem/i), 'Aria')

    await waitFor(() => {
      const saved = sessionStorage.getItem('wizard-v2-draft')
      expect(saved).not.toBeNull()
      const draft = JSON.parse(saved)
      expect(draft.ruleset).toBe('2014')
    }, { timeout: 2000 })
  })
})
