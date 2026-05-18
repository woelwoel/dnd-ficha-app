import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DamageModal } from '../components/CharacterSheet/DamageModal'

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
    expect(screen.getByRole('button', { name: /⚔ Aplicar Dano/ })).toBeDisabled()
  })

  it('confirma com valor + critical + tipo', async () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(<DamageModal open={true} onClose={onClose} onConfirm={onConfirm} />)

    await userEvent.type(screen.getByLabelText(/quantidade/i), '12')
    await userEvent.click(screen.getByLabelText(/crítico/i))
    await userEvent.selectOptions(screen.getByLabelText(/tipo de dano/i), 'fire')
    await userEvent.click(screen.getByRole('button', { name: /⚔ Aplicar Dano/ }))

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
    const { container } = render(<DamageModal open={true} onClose={onClose} onConfirm={() => {}} />)
    fireEvent.click(container.firstChild)
    expect(onClose).toHaveBeenCalled()
  })

  it('type null quando não selecionado', async () => {
    const onConfirm = vi.fn()
    render(<DamageModal open={true} onClose={() => {}} onConfirm={onConfirm} />)
    await userEvent.type(screen.getByLabelText(/quantidade/i), '3')
    await userEvent.click(screen.getByRole('button', { name: /⚔ Aplicar Dano/ }))
    expect(onConfirm).toHaveBeenCalledWith(3, { critical: false, type: null })
  })
})
