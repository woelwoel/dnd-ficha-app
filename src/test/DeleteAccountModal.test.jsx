import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { DeleteAccountModal } from '../components/ui/DeleteAccountModal'

// O modal só precisa do `deleteAccount` do AuthProvider; o resto do contexto
// de auth não influencia nada do que se testa aqui.
const deleteAccount = vi.fn(async () => ({ ok: true }))
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ deleteAccount }),
}))

describe('DeleteAccountModal', () => {
  /**
   * O Modal foca `initialFocusRef ?? botão de fechar` 50 ms depois de abrir.
   * Sem `initialFocusRef`, esse timer roubava o foco do campo de confirmação —
   * e aqui o custo é alto: é o campo que destrava o botão de apagar a conta,
   * então quem digitasse "APAGAR" de imediato perdia as primeiras letras e
   * ficava olhando um botão que não habilita.
   */
  it('mantém o foco no campo de confirmação depois do timer de foco do Modal', () => {
    vi.useFakeTimers()
    try {
      render(<DeleteAccountModal onClose={() => {}} />)
      const input = screen.getByLabelText(/digite/i)
      act(() => { vi.advanceTimersByTime(200) })
      expect(document.activeElement).toBe(input)
    } finally {
      vi.useRealTimers()
    }
  })

  it('o campo de confirmação tem rótulo associado', () => {
    render(<DeleteAccountModal onClose={() => {}} />)
    expect(screen.getByLabelText(/digite/i).tagName).toBe('INPUT')
  })

  it('o botão de apagar só habilita com a palavra exata', () => {
    render(<DeleteAccountModal onClose={() => {}} />)
    const botao = screen.getByRole('button', { name: /Apagar para sempre/i })
    expect(botao).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/digite/i), { target: { value: 'apagar' } })
    expect(botao).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/digite/i), { target: { value: 'APAGAR' } })
    expect(botao).toBeEnabled()
  })
})
