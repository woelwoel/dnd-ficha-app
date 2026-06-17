import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const auth = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  requestPasswordReset: vi.fn(),
}))

vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => auth,
}))

import { LoginScreen } from '../../auth/LoginScreen'

describe('LoginScreen', () => {
  // delay:null evita timers reais entre teclas — sem isso, userEvent.type pode
  // estourar o timeout de 5s sob carga da suíte completa (~1000+ testes).
  let user
  beforeEach(() => {
    user = userEvent.setup({ delay: null })
    vi.clearAllMocks()
    auth.signIn.mockResolvedValue({ data: {}, error: null })
    auth.signUp.mockResolvedValue({ data: {}, error: null })
    auth.requestPasswordReset.mockResolvedValue({ data: {}, error: null })
  })

  it('renderiza aba Entrar por default com email/senha', () => {
    render(<LoginScreen />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument()
  })

  it('faz login ao submeter o form', async () => {
    render(<LoginScreen />)
    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/senha/i), 'segredo12')
    await user.click(screen.getByRole('button', { name: /^entrar$/i }))
    expect(auth.signIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'segredo12' })
  })

  it('exibe erro quando signIn retorna error', async () => {
    auth.signIn.mockResolvedValue({ data: {}, error: { message: 'Invalid login credentials' } })
    render(<LoginScreen />)
    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/senha/i), 'segredo12')
    await user.click(screen.getByRole('button', { name: /^entrar$/i }))
    expect(await screen.findByText(/credenciais inválidas/i)).toBeInTheDocument()
  })

  it('troca para aba Criar conta e chama signUp', async () => {
    render(<LoginScreen />)
    await user.click(screen.getByRole('tab', { name: /criar conta/i }))
    await user.type(screen.getByLabelText(/email/i), 'novo@b.com')
    await user.type(screen.getByLabelText(/senha/i), 'segredo12')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'novo@b.com', password: 'segredo12' })
  })

  it('mostra mensagem após cadastro pedindo confirmação de email', async () => {
    render(<LoginScreen />)
    await user.click(screen.getByRole('tab', { name: /criar conta/i }))
    await user.type(screen.getByLabelText(/email/i), 'novo@b.com')
    await user.type(screen.getByLabelText(/senha/i), 'segredo12')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(await screen.findByText(/confirme seu email/i)).toBeInTheDocument()
  })

  it('valida senha mínima de 8 chars no cadastro antes de chamar signUp', async () => {
    render(<LoginScreen />)
    await user.click(screen.getByRole('tab', { name: /criar conta/i }))
    await user.type(screen.getByLabelText(/email/i), 'novo@b.com')
    await user.type(screen.getByLabelText(/senha/i), 'curta')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(auth.signUp).not.toHaveBeenCalled()
    expect(await screen.findByText(/pelo menos 8/i)).toBeInTheDocument()
  })

  it('fluxo de esqueci a senha pede email e chama requestPasswordReset', async () => {
    render(<LoginScreen />)
    await user.click(screen.getByRole('button', { name: /esqueci a senha/i }))
    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.click(screen.getByRole('button', { name: /enviar link/i }))
    expect(auth.requestPasswordReset).toHaveBeenCalledWith('a@b.com')
    expect(await screen.findByText(/enviamos um link/i)).toBeInTheDocument()
  })
})
