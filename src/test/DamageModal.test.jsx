import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DamageModal } from '../systems/dnd5e/components/CharacterSheet/DamageModal'

describe('DamageModal', () => {
  it('não renderiza quando open=false', () => {
    render(<DamageModal open={false} onClose={() => {}} onConfirm={() => {}} />)
    expect(screen.queryByText(/aplicar dano/i)).not.toBeInTheDocument()
  })

  it('renderiza título + input + select + checkbox quando aberto', () => {
    render(<DamageModal open={true} onClose={() => {}} onConfirm={() => {}} />)
    expect(screen.getByRole('heading', { name: /aplicar dano/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/quantidade/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tipo de dano/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/crítico/i)).toBeInTheDocument()
  })

  it('botão aplicar desabilitado quando valor é 0', () => {
    render(<DamageModal open={true} onClose={() => {}} onConfirm={() => {}} />)
    // Há 2 botões "Aplicar Dano" (footer + header subtítulo) — pega o do footer
    // pelo data-attribute disabled-friendly: o botão CTA.
    const buttons = screen.getAllByRole('button', { name: /Aplicar Dano/i })
    const cta = buttons.find(b => b.hasAttribute('disabled') || b.getAttribute('disabled') === '')
      ?? buttons[buttons.length - 1]
    expect(cta).toBeDisabled()
  })

  it('confirma com valor + critical + tipo', async () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(<DamageModal open={true} onClose={onClose} onConfirm={onConfirm} />)

    await userEvent.type(screen.getByLabelText(/quantidade/i), '12')
    await userEvent.click(screen.getByLabelText(/crítico/i))
    await userEvent.selectOptions(screen.getByLabelText(/tipo de dano/i), 'fire')
    // O CTA fica no footer — pega o último botão com nome "Aplicar Dano"
    const buttons = screen.getAllByRole('button', { name: /Aplicar Dano/i })
    await userEvent.click(buttons[buttons.length - 1])

    expect(onConfirm).toHaveBeenCalledWith(12, { critical: true, type: 'fire' })
    expect(onClose).toHaveBeenCalled()
  })

  it('Enter no input aplica', async () => {
    const onConfirm = vi.fn()
    render(<DamageModal open={true} onClose={() => {}} onConfirm={onConfirm} />)
    await userEvent.type(screen.getByLabelText(/quantidade/i), '5{Enter}')
    expect(onConfirm).toHaveBeenCalledWith(5, { critical: false, type: null })
  })

  it('Cancelar fecha sem confirmar', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(<DamageModal open={true} onClose={onClose} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }))
    expect(onClose).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('click no backdrop fecha', () => {
    const onClose = vi.fn()
    render(<DamageModal open={true} onClose={onClose} onConfirm={() => {}} />)
    // Modal renderiza via portal em document.body — backdrop é o div fixed
    // top-level. Buscamos pelo role=dialog e clicamos no seu pai.
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog.parentElement)
    expect(onClose).toHaveBeenCalled()
  })

  it('type null quando não selecionado', async () => {
    const onConfirm = vi.fn()
    render(<DamageModal open={true} onClose={() => {}} onConfirm={onConfirm} />)
    await userEvent.type(screen.getByLabelText(/quantidade/i), '3')
    const buttons = screen.getAllByRole('button', { name: /Aplicar Dano/i })
    await userEvent.click(buttons[buttons.length - 1])
    expect(onConfirm).toHaveBeenCalledWith(3, { critical: false, type: null })
  })
})
