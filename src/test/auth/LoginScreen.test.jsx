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
    await user.type(screen.getByLabelText(/senha/i), 'Segredo12!')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'novo@b.com', password: 'Segredo12!' })
  })

  it('mostra mensagem após cadastro pedindo confirmação de email (sem sessão)', async () => {
    render(<LoginScreen />)
    await user.click(screen.getByRole('tab', { name: /criar conta/i }))
    await user.type(screen.getByLabelText(/email/i), 'novo@b.com')
    await user.type(screen.getByLabelText(/senha/i), 'Segredo12!')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(await screen.findByText(/confirme seu email/i)).toBeInTheDocument()
  })

  it('NÃO pede confirmação quando o cadastro já devolve sessão (confirmação desligada)', async () => {
    auth.signUp.mockResolvedValue({ data: { session: { access_token: 'x' } }, error: null })
    render(<LoginScreen />)
    await user.click(screen.getByRole('tab', { name: /criar conta/i }))
    await user.type(screen.getByLabelText(/email/i), 'novo@b.com')
    await user.type(screen.getByLabelText(/senha/i), 'Segredo12!')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(auth.signUp).toHaveBeenCalled()
    expect(screen.queryByText(/confirme seu email/i)).not.toBeInTheDocument()
  })

  it('valida tamanho da senha no cadastro antes de chamar signUp', async () => {
    render(<LoginScreen />)
    await user.click(screen.getByRole('tab', { name: /criar conta/i }))
    await user.type(screen.getByLabelText(/email/i), 'novo@b.com')
    await user.type(screen.getByLabelText(/senha/i), 'Cur1!')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(auth.signUp).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent(/de 8 a 50 caracteres/i)
  })

  it('barra senha sem maiúscula/símbolo e diz em português o que falta', async () => {
    render(<LoginScreen />)
    await user.click(screen.getByRole('tab', { name: /criar conta/i }))
    await user.type(screen.getByLabelText(/email/i), 'novo@b.com')
    await user.type(screen.getByLabelText(/senha/i), 'segredo12')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))
    expect(auth.signUp).not.toHaveBeenCalled()
    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/maiúscula/i)
    expect(alerta).toHaveTextContent(/símbolo/i)
  })

  it('mostra a lista de requisitos da senha na aba Criar conta', async () => {
    render(<LoginScreen />)
    await user.click(screen.getByRole('tab', { name: /criar conta/i }))
    expect(screen.getByText(/de 8 a 50 caracteres/i)).toBeInTheDocument()
    expect(screen.getByText(/letra maiúscula/i)).toBeInTheDocument()
    expect(screen.getByText(/um número/i)).toBeInTheDocument()
    expect(screen.getByText(/um símbolo/i)).toBeInTheDocument()
  })

  it('não mostra a lista de requisitos na aba Entrar', () => {
    render(<LoginScreen />)
    expect(screen.queryByText(/de 8 a 50 caracteres/i)).not.toBeInTheDocument()
  })

  it('limita o campo de senha do cadastro a 50 caracteres', async () => {
    render(<LoginScreen />)
    await user.click(screen.getByRole('tab', { name: /criar conta/i }))
    expect(screen.getByLabelText(/senha/i)).toHaveAttribute('maxlength', '50')
  })

  it('traduz o erro cru de requisitos de senha vindo do Supabase', async () => {
    auth.signUp.mockResolvedValue({
      data: {},
      error: { message: 'Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789.' },
    })
    render(<LoginScreen />)
    await user.click(screen.getByRole('tab', { name: /criar conta/i }))
    await user.type(screen.getByLabelText(/email/i), 'novo@b.com')
    await user.type(screen.getByLabelText(/senha/i), 'Segredo12!')
    await user.click(screen.getByRole('button', { name: /criar conta/i }))
    const alerta = await screen.findByRole('alert')
    expect(alerta).not.toHaveTextContent(/abcdefghijklmnopqrstuvwxyz/)
    expect(alerta).toHaveTextContent(/senha/i)
    expect(alerta).toHaveTextContent(/maiúscula/i)
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
