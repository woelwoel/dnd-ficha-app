import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const auth = vi.hoisted(() => ({ updatePassword: vi.fn() }))
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => auth }))

import { ResetPasswordScreen } from '../../auth/ResetPasswordScreen'

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.updatePassword.mockResolvedValue({ data: {}, error: null })
  })

  it('renderiza campos de nova senha e confirmação', () => {
    render(<ResetPasswordScreen />)
    expect(screen.getByLabelText(/nova senha/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument()
  })

  it('rejeita senhas diferentes', async () => {
    render(<ResetPasswordScreen />)
    await userEvent.type(screen.getByLabelText(/nova senha/i), 'Senhaabc1!')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'Outracoisa2!')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(auth.updatePassword).not.toHaveBeenCalled()
    expect(await screen.findByText(/não conferem/i)).toBeInTheDocument()
  })

  it('rejeita senha fora dos requisitos e diz o que falta', async () => {
    render(<ResetPasswordScreen />)
    await userEvent.type(screen.getByLabelText(/nova senha/i), 'curta')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'curta')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(auth.updatePassword).not.toHaveBeenCalled()
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/de 8 a 50 caracteres/i)
    expect(alerta).toHaveTextContent(/maiúscula/i)
  })

  it('mostra a lista de requisitos da senha', () => {
    render(<ResetPasswordScreen />)
    expect(screen.getByText(/de 8 a 50 caracteres/i)).toBeInTheDocument()
    expect(screen.getByText(/um símbolo/i)).toBeInTheDocument()
  })

  it('limita os campos de senha a 50 caracteres', () => {
    render(<ResetPasswordScreen />)
    expect(screen.getByLabelText(/nova senha/i)).toHaveAttribute('maxlength', '50')
    expect(screen.getByLabelText(/confirmar senha/i)).toHaveAttribute('maxlength', '50')
  })

  it('chama updatePassword quando válido', async () => {
    render(<ResetPasswordScreen />)
    await userEvent.type(screen.getByLabelText(/nova senha/i), 'Novasenha1!')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'Novasenha1!')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(auth.updatePassword).toHaveBeenCalledWith('Novasenha1!')
  })
})
