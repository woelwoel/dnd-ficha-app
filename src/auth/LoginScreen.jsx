import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { Button } from '../components/ui/Button'

const TABS = { SIGNIN: 'signin', SIGNUP: 'signup', FORGOT: 'forgot' }

function translateError(message) {
  if (!message) return 'Erro desconhecido.'
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Credenciais inválidas.'
  if (m.includes('email not confirmed')) return 'Confirme seu email antes de entrar.'
  if (m.includes('user already registered')) return 'Email já cadastrado.'
  if (m.includes('password') && m.includes('weak')) return 'Senha muito fraca.'
  return message
}

export function LoginScreen() {
  const { signIn, signUp, requestPasswordReset } = useAuth()
  const [tab, setTab] = useState(TABS.SIGNIN)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  function reset() {
    setError(null)
    setInfo(null)
  }

  async function onSubmitSignIn(e) {
    e.preventDefault()
    reset()
    setBusy(true)
    const { error } = await signIn({ email, password })
    setBusy(false)
    if (error) setError(translateError(error.message))
  }

  async function onSubmitSignUp(e) {
    e.preventDefault()
    reset()
    if (password.length < 8) {
      setError('Senha deve ter pelo menos 8 caracteres.')
      return
    }
    setBusy(true)
    const { error } = await signUp({ email, password })
    setBusy(false)
    if (error) setError(translateError(error.message))
    else setInfo('Confirme seu email para ativar a conta.')
  }

  async function onSubmitForgot(e) {
    e.preventDefault()
    reset()
    setBusy(true)
    const { error } = await requestPasswordReset(email)
    setBusy(false)
    if (error) setError(translateError(error.message))
    else setInfo('Enviamos um link para o email informado.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950 text-gray-100">
      <div className="w-full max-w-sm border border-gray-800 rounded-lg p-6 bg-gray-900">
        <h1 className="text-xl font-bold text-center mb-4" style={{ fontFamily: 'IM Fell English SC, serif', color: 'var(--color-gold-400)' }}>
          Forja de Heróis
        </h1>

        {tab !== TABS.FORGOT && (
          <div role="tablist" className="flex mb-4 border-b border-gray-800">
            <button
              role="tab"
              aria-selected={tab === TABS.SIGNIN}
              className={`flex-1 py-2 text-sm ${tab === TABS.SIGNIN ? 'border-b-2 border-amber-400 text-amber-400' : 'text-gray-400'}`}
              onClick={() => { setTab(TABS.SIGNIN); reset() }}
              type="button"
            >Entrar</button>
            <button
              role="tab"
              aria-selected={tab === TABS.SIGNUP}
              className={`flex-1 py-2 text-sm ${tab === TABS.SIGNUP ? 'border-b-2 border-amber-400 text-amber-400' : 'text-gray-400'}`}
              onClick={() => { setTab(TABS.SIGNUP); reset() }}
              type="button"
            >Criar conta</button>
          </div>
        )}

        {tab === TABS.FORGOT ? (
          <form onSubmit={onSubmitForgot} className="space-y-3">
            <h2 className="text-sm text-gray-300">Redefinir senha</h2>
            <label className="block">
              <span className="text-xs text-gray-400">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
              />
            </label>
            <Button type="submit" variant="gold" size="md" disabled={busy} className="w-full">
              Enviar link
            </Button>
            <button type="button" className="text-xs text-gray-400 underline" onClick={() => { setTab(TABS.SIGNIN); reset() }}>
              Voltar
            </button>
          </form>
        ) : (
          <form onSubmit={tab === TABS.SIGNIN ? onSubmitSignIn : onSubmitSignUp} className="space-y-3">
            <label className="block">
              <span className="text-xs text-gray-400">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Senha</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
              />
            </label>
            <Button type="submit" variant="gold" size="md" disabled={busy} className="w-full">
              {tab === TABS.SIGNIN ? 'Entrar' : 'Criar conta'}
            </Button>
            {tab === TABS.SIGNIN && (
              <button type="button" className="text-xs text-gray-400 underline" onClick={() => { setTab(TABS.FORGOT); reset() }}>
                Esqueci a senha
              </button>
            )}
          </form>
        )}

        {error && <p role="alert" className="mt-3 text-xs text-red-400">{error}</p>}
        {info && <p className="mt-3 text-xs text-emerald-400">{info}</p>}
      </div>
    </div>
  )
}
