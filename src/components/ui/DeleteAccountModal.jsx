import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from './Button'

const CONFIRM_WORD = 'APAGAR'

/**
 * Modal de apagar conta. Pra evitar deleção acidental, o botão final só
 * habilita quando o user digita exatamente "APAGAR".
 *
 * Ao confirmar, chama `deleteAccount()` do AuthProvider, que faz a RPC
 * `delete_my_account` (cascade limpa profiles+characters+memberships) e
 * em seguida `signOut`. O Gate de App.jsx detecta o signOut e manda
 * pra LoginScreen.
 */
export function DeleteAccountModal({ onClose }) {
  const { deleteAccount } = useAuth()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function onDelete() {
    if (typed !== CONFIRM_WORD) return
    setBusy(true); setErr(null)
    const r = await deleteAccount()
    setBusy(false)
    if (!r.ok) { setErr('Falha ao apagar conta. Tente novamente.'); return }
    // signOut já roda dentro de deleteAccount; Gate redireciona pra LoginScreen.
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-red-900 rounded p-6 max-w-md w-full">
        <h2 className="text-red-400 text-lg font-bold mb-2">Apagar conta?</h2>
        <p className="text-sm text-gray-300 mb-2">
          Essa ação <strong>não pode ser desfeita</strong>. Tudo será removido:
        </p>
        <ul className="text-sm text-gray-400 list-disc list-inside mb-4 space-y-0.5">
          <li>Todas as suas fichas</li>
          <li>Sua participação em mesas</li>
          <li>Mesas onde você é o Mestre (incluindo fichas dos jogadores nelas)</li>
        </ul>
        <p className="text-xs text-gray-400 mb-1">
          Para confirmar, digite <code className="text-red-300">{CONFIRM_WORD}</code>:
        </p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-gray-100 mb-3"
          autoFocus
        />
        {err && <p className="text-xs text-red-400 mb-2">{err}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost-dark" size="sm" onClick={onClose} disabled={busy}>Cancelar</Button>
          <button
            onClick={onDelete}
            disabled={busy || typed !== CONFIRM_WORD}
            className="px-4 py-1.5 rounded bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 text-parchment-50 text-sm transition"
          >
            {busy ? 'Apagando…' : 'Apagar para sempre'}
          </button>
        </div>
      </div>
    </div>
  )
}
