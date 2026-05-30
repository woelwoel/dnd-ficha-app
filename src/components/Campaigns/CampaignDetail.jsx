import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { deleteCampaign } from '../../lib/campaigns'
import { InviteCodeBox } from './InviteCodeBox'
import { MembersList } from './MembersList'
import { CampaignCharactersList } from './CampaignCharactersList'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { AccountMenu } from '../ui/AccountMenu'

/**
 * Tela /campaigns/:id. Para DM: vê código + rotaciona + remove membros +
 * lê fichas dos jogadores. Para player: vê código (copiar) + lista de membros
 * + botão sair.
 */
export function CampaignDetail({ campaignId, onBack }) {
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const navigate = useNavigate()

  async function performDelete() {
    setDeleting(true)
    setDeleteError(null)
    const res = await deleteCampaign(campaign.id)
    setDeleting(false)
    if (!res.ok) {
      setDeleteError(res.message || res.reason || 'Erro desconhecido')
      return
    }
    setConfirmOpen(false)
    navigate('/campaigns')
  }

  const reload = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id ?? null)
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, dm_id, invite_code')
      .eq('id', campaignId)
      .maybeSingle()
    setCampaign(data)
    setLoading(false)
  }, [campaignId])

  useEffect(() => { reload() }, [reload])

  if (loading) return <div className="p-6 text-amber-400 text-sm">Carregando mesa…</div>
  if (!campaign) {
    return (
      <div className="p-6 flex flex-col gap-2 text-amber-400 text-sm">
        <p>Mesa não encontrada (ou sem permissão).</p>
        <Button variant="ghost-dark" size="sm" onClick={onBack}>Voltar</Button>
      </div>
    )
  }

  const isDM = campaign.dm_id === userId

  return (
    <div className="min-h-screen p-4 bg-bg-canvas">
      <header className="flex items-center justify-between mb-6 max-w-4xl mx-auto">
        <div>
          <button onClick={onBack} className="text-xs text-gray-400 hover:text-amber-300">← Mesas</button>
          <h1 className="text-2xl text-amber-400 mt-1 font-display">
            {campaign.name}
          </h1>
          <p className="text-xs text-gray-500">{isDM ? 'Você é o Mestre' : 'Você é Jogador'}</p>
        </div>
        <AccountMenu />
      </header>

      <div className="max-w-4xl mx-auto grid gap-4">
        <InviteCodeBox
          campaignId={campaign.id}
          code={campaign.invite_code}
          isDM={isDM}
          onRotated={(code) => setCampaign(c => ({ ...c, invite_code: code }))}
        />
        <MembersList
          campaignId={campaign.id}
          currentUserId={userId}
          isDM={isDM}
          onChanged={(ev) => ev?.left ? navigate('/campaigns') : null}
        />
        {isDM && (
          <CampaignCharactersList
            campaignId={campaign.id}
            onOpen={(idOrShort) => navigate(`/c/${idOrShort}`)}
          />
        )}

        {isDM && (
          <div className="mt-6 pt-4 border-t border-shell-border flex flex-col gap-2">
            <p className="text-xs text-gray-500">
              Zona de perigo — apagar a mesa remove os membros e desvincula as fichas (elas voltam a ser pessoais dos donos).
            </p>
            <div>
              <Button
                variant="ghost-dark"
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={deleting}
                className="!text-red-400 !border-red-900/60 hover:!bg-red-950/30"
              >
                Apagar mesa
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Apagar mesa?"
        message={
          <>
            <p className="mb-2">
              Apagar a mesa <strong>"{campaign.name}"</strong>?
            </p>
            <p className="ink-italic text-ink-300">
              Os jogadores serão removidos e as fichas voltam a ser pessoais.
              Essa ação não pode ser desfeita.
            </p>
            {deleteError && (
              <p className="mt-3 text-red-700 text-xs">
                Falha: {deleteError}
              </p>
            )}
          </>
        }
        confirmLabel={deleting ? 'Apagando…' : 'Apagar mesa'}
        cancelLabel="Cancelar"
        variant="danger"
        busy={deleting}
        onConfirm={performDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteError(null) }}
      />
    </div>
  )
}
