import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { Button } from '../components/ui/Button'

export function ResetPasswordScreen() {
  const { updatePassword } = useAuth()
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950 text-gray-100">
      <form onSubmit={onSubmit} className="w-full max-w-sm border border-gray-800 rounded-lg p-6 bg-gray-900 space-y-3">
        <h1 className="text-lg font-bold" style={{ fontFamily: 'IM Fell English SC, serif', color: 'var(--color-gold-400)' }}>
          Definir nova senha
        </h1>
        <label className="block">
          <span className="text-xs text-gray-400">Nova senha</span>
          <input
            type="password"
            required
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-400">Confirmar senha</span>
          <input
            type="password"
            required
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
          />
        </label>
        <Button type="submit" variant="gold" size="md" disabled={busy} className="w-full">
          Salvar
        </Button>
        {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
        {info && <p className="text-xs text-emerald-400">{info}</p>}
      </form>
    </div>
  )
}
