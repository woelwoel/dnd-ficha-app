import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useState } from 'react'
import { Modal } from '../components/ui/Modal'

// Reproduz o bug "digitando letra por letra": o pai do Modal re-renderiza a
// cada keystroke (state do draft), passando um onClose inline novo. Se o efeito
// de foco do Modal depender de onClose, ele re-executa e rouba o foco do input
// de volta pro botão "✕" 50ms depois.
function Harness() {
  const [n, setN] = useState(0)
  return (
    <Modal open onClose={() => {}} title="T">
      <input aria-label="campo" />
      <button onClick={() => setN(n + 1)}>rerender {n}</button>
    </Modal>
  )
}

describe('Modal — gerenciamento de foco', () => {
  it('não rouba o foco do input em re-renders do pai enquanto aberto', () => {
    vi.useFakeTimers()
    try {
      render(<Harness />)
      // Deixa o foco inicial assentar no botão de fechar (comportamento esperado ao abrir).
      act(() => { vi.advanceTimersByTime(60) })

      const input = screen.getByLabelText('campo')
      act(() => { input.focus() })
      expect(input).toHaveFocus()

      // Simula um keystroke: pai re-renderiza com onClose inline novo.
      // fireEvent.click NÃO move o foco no jsdom, então o input continua focado aqui.
      fireEvent.click(screen.getByText(/rerender/i))
      act(() => { vi.advanceTimersByTime(60) })

      // O foco deve permanecer no input, não saltar pro botão "✕".
      expect(input).toHaveFocus()
    } finally {
      vi.useRealTimers()
    }
  })

  /**
   * Sem `initialFocusRef`, o Modal foca o "✕" 50 ms depois de abrir. Isso é o
   * certo quando não há nada pra preencher — mas desfazia o `autoFocus` de
   * quem tem campo, e o usuário perdia as primeiras teclas em silêncio. Já
   * mordeu DamageModal e DeleteAccountModal, e levou o SrdSearchModal a
   * duplicar o timer de 50 ms por fora só pra ganhar a corrida.
   */
  it('não rouba o foco de um campo que o conteúdo já focou sozinho', () => {
    vi.useFakeTimers()
    try {
      render(
        <Modal open onClose={() => {}} title="T">
          <input aria-label="campo" autoFocus />
        </Modal>
      )
      const input = screen.getByLabelText('campo')
      act(() => { vi.advanceTimersByTime(200) })
      expect(input).toHaveFocus()
    } finally {
      vi.useRealTimers()
    }
  })

  it('ainda foca o botão de fechar quando o conteúdo não foca nada', () => {
    vi.useFakeTimers()
    try {
      render(
        <Modal open onClose={() => {}} title="T" closeLabel="Fechar modal">
          <p>Só texto, nada pra preencher.</p>
        </Modal>
      )
      act(() => { vi.advanceTimersByTime(200) })
      expect(screen.getByRole('button', { name: 'Fechar modal' })).toHaveFocus()
    } finally {
      vi.useRealTimers()
    }
  })
})
