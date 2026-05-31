import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'

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

/* ── Logo ornamentado (glyph + ícone + glyph) ──────────────────
 * Substitui o título nu por uma marca tematizada: dois ❦ enquadrando
 * espadas cruzadas. Tudo sépia, sem assets externos. */
function ForgeLogo() {
  return (
    <div className="flex items-center justify-center gap-3 select-none" aria-hidden>
      <span className="text-2xl text-parchment-600 leading-none">❦</span>
      <span className="text-ink-500">
        <Icon name="swords" size={28} strokeWidth={1.5} />
      </span>
      <span className="text-2xl text-parchment-600 leading-none">❦</span>
    </div>
  )
}

export function LoginScreen() {
  const { signIn, signUp, requestPasswordReset } = useAuth()
  const [tab, setTab] = useState(TABS.SIGNIN)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  const submitting = busy
  const submitLabel = tab === TABS.SIGNIN
    ? (submitting ? 'Entrando…' : 'Entrar')
    : tab === TABS.SIGNUP
      ? (submitting ? 'Criando conta…' : 'Criar conta')
      : (submitting ? 'Enviando…' : 'Enviar link')

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm relative bg-parchment-50 border-2 border-parchment-600 rounded-sm p-7 shadow-parchment-lg">
        {/* Cantos decorativos (mesmo motivo do CampaignSetupModal) */}
        <span aria-hidden className="absolute top-2 left-2  w-3 h-3 border-l-2 border-t-2 border-parchment-600/70" />
        <span aria-hidden className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-parchment-600/70" />
        <span aria-hidden className="absolute bottom-2 left-2  w-3 h-3 border-l-2 border-b-2 border-parchment-600/70" />
        <span aria-hidden className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-parchment-600/70" />

        <header className="text-center mb-5">
          <ForgeLogo />
          <h1 className="mt-3 text-2xl font-display tracking-widest uppercase text-ink-500 leading-tight">
            Forja de Heróis
          </h1>
          <p className="mt-1 text-xs ink-italic text-ink-300">
            Sua ficha de D&amp;D 5e — grátis, salva na nuvem
          </p>
        </header>

        {tab !== TABS.FORGOT && (
          <div role="tablist" className="flex gap-1 mb-4 border-b border-parchment-600">
            <button
              role="tab"
              aria-selected={tab === TABS.SIGNIN}
              type="button"
              onClick={() => { setTab(TABS.SIGNIN); reset() }}
              className={`flex-1 py-2 text-sm font-display tracking-wide transition-colors ${
                tab === TABS.SIGNIN
                  ? 'border-b-2 border-ink-500 text-ink-500 font-semibold'
                  : 'text-ink-300 hover:text-ink-500'
              }`}
            >Entrar</button>
            <button
              role="tab"
              aria-selected={tab === TABS.SIGNUP}
              type="button"
              onClick={() => { setTab(TABS.SIGNUP); reset() }}
              className={`flex-1 py-2 text-sm font-display tracking-wide transition-colors ${
                tab === TABS.SIGNUP
                  ? 'border-b-2 border-ink-500 text-ink-500 font-semibold'
                  : 'text-ink-300 hover:text-ink-500'
              }`}
            >Criar conta</button>
          </div>
        )}

        {tab === TABS.FORGOT ? (
          <form onSubmit={onSubmitForgot} className="space-y-3">
            <h2 className="text-sm font-display text-ink-500 uppercase tracking-widest">
              Redefinir senha
            </h2>
            <p className="text-xs ink-italic text-ink-300 -mt-2">
              Vamos te enviar um link pra criar uma senha nova.
            </p>
            <label className="block">
              <span className="text-xs font-display tracking-widest uppercase text-ink-300">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-parchment-100 border-2 border-parchment-600 rounded-sm text-sm text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
              />
            </label>
            <Button type="submit" variant="gold" size="md" disabled={busy} className="w-full">
              {submitLabel}
            </Button>
            <button
              type="button"
              className="text-xs ink-italic text-ink-300 hover:text-ink-500 underline"
              onClick={() => { setTab(TABS.SIGNIN); reset() }}
            >
              ← Voltar
            </button>
          </form>
        ) : (
          <form onSubmit={tab === TABS.SIGNIN ? onSubmitSignIn : onSubmitSignUp} className="space-y-3">
            <label className="block">
              <span className="text-xs font-display tracking-widest uppercase text-ink-300">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-parchment-100 border-2 border-parchment-600 rounded-sm text-sm text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
              />
            </label>
            <div>
              <label className="block">
                <span className="text-xs font-display tracking-widest uppercase text-ink-300">Senha</span>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete={tab === TABS.SIGNIN ? 'current-password' : 'new-password'}
                    minLength={tab === TABS.SIGNUP ? 8 : undefined}
                    placeholder={tab === TABS.SIGNUP ? 'mín. 8 caracteres' : ''}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-parchment-100 border-2 border-parchment-600 rounded-sm text-sm text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Esconder' : 'Mostrar'}
                    title={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 px-3 inline-flex items-center text-ink-300 hover:text-ink-500"
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} strokeWidth={1.75} />
                  </button>
                </div>
              </label>
              {tab === TABS.SIGNIN && (
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => { setTab(TABS.FORGOT); reset() }}
                    className="text-xs ink-italic text-ink-300 hover:text-ink-500 underline"
                  >
                    Esqueci a senha
                  </button>
                </div>
              )}
            </div>
            <Button type="submit" variant="gold" size="md" disabled={busy} className="w-full">
              {submitLabel}
            </Button>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-3 text-xs text-red-700 bg-red-50 border border-red-300 rounded-sm px-2 py-1.5">
            {error}
          </p>
        )}
        {info && (
          <p className="mt-3 text-xs text-green-700 bg-green-50 border border-green-300 rounded-sm px-2 py-1.5">
            {info}
          </p>
        )}
      </div>
    </div>
  )
}
