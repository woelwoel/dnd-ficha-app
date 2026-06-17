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
})
