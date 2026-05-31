import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Modal } from './Modal'

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

  const canDelete = typed === CONFIRM_WORD && !busy

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Apagar conta?"
      size="md"
      dismissOnBackdrop={!busy}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-1.5 rounded-sm border-2 border-parchment-600 hover:border-ink-300 text-ink-300 hover:text-ink-500 text-sm font-display tracking-wide disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={!canDelete}
            className="px-4 py-1.5 rounded-sm bg-red-700 hover:bg-red-600 border-2 border-red-800 text-parchment-50 text-sm font-display tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Apagando…' : 'Apagar para sempre'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-ink-500">
          Essa ação <strong>não pode ser desfeita</strong>. Tudo será removido:
        </p>
        <ul className="text-sm text-ink-300 list-disc list-inside space-y-0.5">
          <li>Todas as suas fichas</li>
          <li>Sua participação em mesas</li>
          <li>Mesas onde você é o Mestre (incluindo fichas dos jogadores nelas)</li>
        </ul>
        <div>
          <label className="text-xs text-ink-300 block mb-1">
            Para confirmar, digite{' '}
            <code className="text-red-700 font-mono font-bold">{CONFIRM_WORD}</code>:
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full px-3 py-2 bg-parchment-100 border-2 border-parchment-600 rounded-sm text-ink-500 focus:outline-none focus:border-ink-300"
            autoFocus
          />
        </div>
        {err && (
          <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-300 rounded-sm px-2 py-1.5">
            {err}
          </p>
        )}
      </div>
    </Modal>
  )
}
