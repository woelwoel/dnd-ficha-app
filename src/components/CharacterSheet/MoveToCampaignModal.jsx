import { useEffect, useState } from 'react'
import { listMyCampaigns, moveCharacterToCampaign } from '../../lib/campaigns'
import { Button } from '../ui/Button'

/**
 * Modal pra mover ficha existente entre "pessoal" e uma mesa.
 * Disparado pelo SheetHeader. Quando confirma, recarrega a ficha
 * pra refletir o novo campaignId.
 */
export function MoveToCampaignModal({ characterId, currentCampaignId, onClose, onMoved }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    listMyCampaigns().then(list => { setCampaigns(list); setLoading(false) })
  }, [])

  async function choose(campaignId) {
    setBusy(true); setErr(null)
    const r = await moveCharacterToCampaign(characterId, campaignId)
    setBusy(false)
    if (!r.ok) {
      setErr(r.reason === 'not-a-member'
        ? 'Você não é mais membro dessa mesa.'
        : 'Falha ao mover. Tente de novo.')
      return
    }
    onMoved?.(campaignId)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="bg-parchment-100 border-2 border-parchment-600 rounded p-6 max-w-md w-full shadow-parchment"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-ink-500 font-display tracking-wide text-lg mb-1">
          Mover ficha
        </h2>
        <p className="text-ink-300 text-xs mb-4">
          A ficha pode ficar como pessoal ou vinculada a uma mesa em que você é membro.
          O DM da mesa passa a poder ler (em modo leitura).
        </p>

        <Button
          variant="gold"
          size="md"
          disabled={busy || currentCampaignId === null}
          onClick={() => choose(null)}
          className="w-full mb-2"
        >
          {currentCampaignId === null ? '✓ Pessoal (atual)' : 'Tornar pessoal'}
        </Button>

        {loading ? (
          <p className="text-amber-700 text-xs">Carregando mesas…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-ink-300 text-xs">Você ainda não tem mesas.</p>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wider text-ink-500 mt-3 mb-1">
              Vincular a mesa:
            </p>
            <div className="flex flex-col gap-1">
              {campaigns.map(c => {
                const isCurrent = currentCampaignId === c.id
                return (
                  <Button
                    key={c.id}
                    variant="ghost-dark"
                    size="sm"
                    disabled={busy || isCurrent}
                    onClick={() => choose(c.id)}
                  >
                    {isCurrent ? `✓ ${c.name} (atual)` : c.name}
                  </Button>
                )
              })}
            </div>
          </>
        )}

        {err && <p className="text-red-700 text-xs mt-3">{err}</p>}

        <div className="flex justify-end mt-4">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-ink-300 hover:text-ink-500 underline"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
