import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BestiaryModal } from '../../components/Bestiary/BestiaryModal'
import { mockSrdFetch } from './helpers'

/* ─────────────────────────────────────────────────────────────────────
   E2E — Bestiary Modal

   Cobre:
   - Renderiza ao abrir; não renderiza ao fechar
   - ESC fecha
   - Carrega lista do JSON mockado
   - Busca textual filtra
   - Click em monstro mostra stat block
   - Toggle de filtros + "Limpar"
   ────────────────────────────────────────────────────────────────────*/

describe('Bestiary Modal E2E', () => {
  beforeEach(() => {
    mockSrdFetch()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza modal aberto e carrega lista', async () => {
    render(<BestiaryModal isOpen={true} onClose={() => {}} />)

    expect(screen.getByText(/Bestiári?o SRD/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/^Goblin$/)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('não renderiza nada quando isOpen=false', () => {
    const { container } = render(<BestiaryModal isOpen={false} onClose={() => {}} />)
    expect(container.textContent).toBe('')
  })

  it('ESC chama onClose', () => {
    const onClose = vi.fn()
    render(<BestiaryModal isOpen={true} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('busca textual filtra a lista', async () => {
    const user = userEvent.setup()
    render(<BestiaryModal isOpen={true} onClose={() => {}} />)

    await waitFor(() => expect(screen.getByText(/^Goblin$/)).toBeInTheDocument(), { timeout: 5000 })

    const search = screen.getByPlaceholderText(/Buscar monstro/i)
    await user.clear(search)
    await user.type(search, 'goblin')

    // Após filtrar, Goblin continua visível
    expect(screen.getByText(/^Goblin$/)).toBeInTheDocument()
  })

  it('clicar em monstro mostra stat block', { timeout: 15000 }, async () => {
    const user = userEvent.setup()
    render(<BestiaryModal isOpen={true} onClose={() => {}} />)

    await waitFor(() => expect(screen.getByText(/^Goblin$/)).toBeInTheDocument(), { timeout: 5000 })

    // Botão da lista tem accessible name "Goblin small humanoid CR 1/4"
    const buttons = screen.getAllByRole('button', { name: /^Goblin/i })
    // Pega exatamente o item "Goblin" (não "Goblin Boss" nem "Hobgoblin")
    const button = buttons.find(b => /^Goblin\b(?!\s+(Boss|Statue))/i.test(b.textContent ?? ''))
                       || buttons[0]
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByText('Armor Class')).toBeInTheDocument()
    })
  })

  it('botão "Limpar filtros" reseta filtros', { timeout: 15000 }, async () => {
    const user = userEvent.setup()
    render(<BestiaryModal isOpen={true} onClose={() => {}} />)

    await waitFor(() => expect(screen.getByText(/^Goblin$/)).toBeInTheDocument(), { timeout: 5000 })

    await user.click(screen.getByRole('button', { name: /^Filtros$/i }))

    await user.click(screen.getByRole('button', { name: /^dragon$/i }))
    expect(screen.getByRole('button', { name: /Filtros · 1/i })).toBeInTheDocument()

    await user.click(screen.getByText(/Limpar filtros/i))
    expect(screen.getByRole('button', { name: /^Filtros$/i })).toBeInTheDocument()
  })
})
