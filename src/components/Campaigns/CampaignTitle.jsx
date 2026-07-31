import { useState } from 'react'
import { renameCampaign } from '../../lib/campaigns'

/**
 * Título da mesa, editável no lugar pelo Mestre. Enter salva, Esc cancela.
 * Falha ao salvar devolve o título ao valor anterior e diz o porquê — deixar o
 * nome novo na tela faria o Mestre acreditar num salvamento que não houve.
 */
export function CampaignTitle({ campaignId, name, canRename, onRenamed }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function abrir() {
    setDraft(name)
    setError(null)
    setEditing(true)
  }

  async function salvar() {
    const limpo = draft.trim()
    if (!limpo || limpo === name) { setEditing(false); return }
    setBusy(true)
    const res = await renameCampaign(campaignId, limpo)
    setBusy(false)
    if (!res.ok) {
      setError(res.reason === 'invalid-name'
        ? 'O nome precisa ter de 1 a 80 caracteres.'
        : 'Não consegui renomear. Tente de novo.')
      return
    }
    setEditing(false)
    setError(null)
    onRenamed?.(limpo)
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-2xl font-display tracking-widest uppercase text-ink-500">{name}</h1>
        {canRename && (
          <button
            type="button"
            onClick={abrir}
            aria-label="Renomear mesa"
            className="text-xs ink-italic text-ink-300 hover:text-ink-500 underline"
          >
            renomear
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          autoFocus
          type="text"
          aria-label="Nome da mesa"
          value={draft}
          disabled={busy}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') salvar()
            if (e.key === 'Escape') { setEditing(false); setError(null) }
          }}
          className="text-2xl font-display tracking-widest uppercase text-ink-500 bg-parchment-50 border-2 border-parchment-600 rounded-sm px-2 py-0.5 min-w-0"
        />
        <button
          type="button"
          onClick={salvar}
          disabled={busy}
          className="text-xs font-display uppercase tracking-wide px-2 py-1 border-2 border-parchment-600 rounded-sm text-ink-500 disabled:opacity-40"
        >
          {busy ? '…' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setError(null) }}
          className="text-xs ink-italic text-ink-300 hover:text-ink-500"
        >
          cancelar
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  )
}
