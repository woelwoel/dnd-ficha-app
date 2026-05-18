import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BestiaryModal } from '../../components/Bestiary/BestiaryModal'
import { mockSrdFetch, clearStorage } from './helpers'

/* ─────────────────────────────────────────────────────────────────────
   Integration — Bestiary Modal (jsdom)

   Cobre apenas comportamentos baratos em jsdom:
   - Renderiza ao abrir
   - Não renderiza quando isOpen=false
   - ESC fecha

   Os 5 fluxos que dependem de interação `userEvent` em lista grande
   (busca, click→stat block, filtros, toggle PT/EN) vivem em
   e2e-pw/bestiary.spec.js — flakiness sob contenção de CPU no jsdom.
   ────────────────────────────────────────────────────────────────────*/

describe('Bestiary Modal (integration)', () => {
  beforeEach(() => {
    clearStorage()
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
})
