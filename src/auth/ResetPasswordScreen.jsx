import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'

export function ResetPasswordScreen() {
  const { updatePassword } = useAuth()
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (pw1.length < 8) {
      setError('Senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (pw1 !== pw2) {
      setError('As senhas não conferem.')
      return
    }
    setBusy(true)
    const { error } = await updatePassword(pw1)
    setBusy(false)
    if (error) setError(error.message)
    else setInfo('Senha atualizada.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm relative bg-parchment-50 border-2 border-parchment-600 rounded-sm p-7 shadow-parchment-lg space-y-3"
      >
        <span aria-hidden className="absolute top-2 left-2  w-3 h-3 border-l-2 border-t-2 border-parchment-600/70" />
        <span aria-hidden className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-parchment-600/70" />
        <span aria-hidden className="absolute bottom-2 left-2  w-3 h-3 border-l-2 border-b-2 border-parchment-600/70" />
        <span aria-hidden className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-parchment-600/70" />

        <header className="text-center">
          <p className="text-xs ink-italic tracking-[0.3em] uppercase text-ink-300 mb-1">Forja de Heróis</p>
          <h1 className="text-lg font-display tracking-widest uppercase text-ink-500">
            Definir nova senha
          </h1>
        </header>

        <label className="block">
          <span className="text-xs font-display tracking-widest uppercase text-ink-300">Nova senha</span>
          <div className="relative mt-1">
            <input
              type={show ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="mín. 8 caracteres"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              className="w-full px-3 py-2 pr-10 bg-parchment-100 border-2 border-parchment-600 rounded-sm text-sm text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
            />
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              aria-label={show ? 'Esconder' : 'Mostrar'}
              title={show ? 'Esconder senha' : 'Mostrar senha'}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 px-3 inline-flex items-center text-ink-300 hover:text-ink-500"
            >
              <Icon name={show ? 'eye-off' : 'eye'} size={16} strokeWidth={1.75} />
            </button>
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-display tracking-widest uppercase text-ink-300">Confirmar senha</span>
          <input
            type={show ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-parchment-100 border-2 border-parchment-600 rounded-sm text-sm text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
          />
        </label>

        <Button type="submit" variant="gold" size="md" disabled={busy} className="w-full">
          {busy ? 'Salvando…' : 'Salvar'}
        </Button>

        {error && (
          <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-300 rounded-sm px-2 py-1.5">
            {error}
          </p>
        )}
        {info && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-300 rounded-sm px-2 py-1.5">
            {info}
          </p>
        )}
      </form>
    </div>
  )
}
