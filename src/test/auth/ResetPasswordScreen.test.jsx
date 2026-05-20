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
    await userEvent.type(screen.getByLabelText(/nova senha/i), 'senhaabc1')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'outracoisa')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(auth.updatePassword).not.toHaveBeenCalled()
    expect(await screen.findByText(/não conferem/i)).toBeInTheDocument()
  })

  it('rejeita senha < 8 chars', async () => {
    render(<ResetPasswordScreen />)
    await userEvent.type(screen.getByLabelText(/nova senha/i), 'curta')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'curta')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(auth.updatePassword).not.toHaveBeenCalled()
    expect(await screen.findByText(/pelo menos 8/i)).toBeInTheDocument()
  })

  it('chama updatePassword quando válido', async () => {
    render(<ResetPasswordScreen />)
    await userEvent.type(screen.getByLabelText(/nova senha/i), 'novasenha1')
    await userEvent.type(screen.getByLabelText(/confirmar senha/i), 'novasenha1')
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(auth.updatePassword).toHaveBeenCalledWith('novasenha1')
  })
})
