import { useEffect, useState } from 'react'
import { listMyCampaigns, moveCharacterToCampaign } from '../../lib/campaigns'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

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
    <Modal
      open={true}
      onClose={onClose}
      title="Mover ficha"
      size="md"
      dismissOnBackdrop={!busy}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="text-xs ink-italic text-ink-300 hover:text-ink-500 underline"
        >
          Cancelar
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-ink-300 text-xs">
          A ficha pode ficar como pessoal ou vinculada a uma mesa em que você é membro.
          O DM da mesa passa a poder ler (em modo leitura).
        </p>

        <Button
          variant="gold"
          size="md"
          disabled={busy || currentCampaignId === null}
          onClick={() => choose(null)}
          className="w-full"
        >
          {currentCampaignId === null ? '✓ Pessoal (atual)' : 'Tornar pessoal'}
        </Button>

        {loading ? (
          <p className="text-ink-300 ink-italic text-xs">Carregando mesas…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-ink-300 ink-italic text-xs">Você ainda não tem mesas.</p>
        ) : (
          <>
            <p className="text-xs font-display uppercase tracking-widest text-ink-500 mt-1">
              Vincular a mesa:
            </p>
            <div className="flex flex-col gap-1">
              {campaigns.map(c => {
                const isCurrent = currentCampaignId === c.id
                return (
                  <Button
                    key={c.id}
                    variant="ghost"
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

        {err && (
          <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-300 rounded-sm px-2 py-1.5">
            {err}
          </p>
        )}
      </div>
    </Modal>
  )
}
