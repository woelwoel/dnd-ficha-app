import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  deleteCampaign, listMembers, removeMember, leaveCampaign,
  fetchCampaignCharacters, loadCampaignRoster,
} from '../../lib/campaigns'
import { fetchActiveEncounter, closeEncounter } from '../../lib/encounters'
import { mergeParty } from '../../lib/campaignParty'
import { InviteCodeBox } from './InviteCodeBox'
import { PartyList } from './PartyList'
import { EncounterStatusCard } from './EncounterStatusCard'
import { CampaignTitle } from './CampaignTitle'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { AccountMenu } from '../ui/AccountMenu'

/**
 * Tela /campaigns/:id (spec 2026-07-31).
 *
 * O topo é o bloco de ação — o que está rolando no combate e como retomar. Só
 * depois vem a companhia (membros e fichas na MESMA lista) e, recolhido, o
 * código de convite, que só importa quando entra gente nova.
 *
 * O Mestre lê as fichas cruas (RLS `characters_select_own_or_dm_of_campaign`);
 * o jogador lê o resumo público pela RPC `campaign_roster` (migration 0011) e
 * enxerga com quem joga sem que a ficha alheia vaze.
 */
export function CampaignDetail({ campaignId, onBack }) {
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [members, setMembers] = useState([])
  const [characters, setCharacters] = useState([])
  const [charFailure, setCharFailure] = useState(null)
  const [encounter, setEncounter] = useState(null)
  const [encounterReadFailed, setEncounterReadFailed] = useState(false)
  const [closingEncounter, setClosingEncounter] = useState(false)
  const [busyMemberId, setBusyMemberId] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const navigate = useNavigate()

  const loadRoster = useCallback(async (isDM) => {
    setMembers(await listMembers(campaignId))
    if (isDM) {
      const res = await fetchCampaignCharacters(campaignId)
      // Lista vazia por falha de leitura é indistinguível de mesa sem fichas —
      // e dizer "ninguém criou ficha" quando a query morreu já escondeu um bug
      // de schema por semanas. Guardamos a falha e mostramos.
      setCharacters(res.ok ? res.rows : [])
      setCharFailure(res.ok ? null : res)
      return
    }
    const res = await loadCampaignRoster(campaignId)
    setCharacters(res.ok ? res.rows : [])
    setCharFailure(res.ok ? null : { message: null })
  }, [campaignId])

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
    if (data) {
      const isDM = data.dm_id === user?.id
      await loadRoster(isDM)
      if (isDM) {
        // LÊ e não cria: `useEncounter` cria um encontro vazio ao montar, de
        // propósito, e abrir a Mesa não pode ter esse efeito colateral.
        const res = await fetchActiveEncounter(campaignId)
        setEncounter(res.row)
        setEncounterReadFailed(!res.ok)
      }
    }
    setLoading(false)
  }, [campaignId, loadRoster])

  useEffect(() => { reload() }, [reload])

  // Realtime nas fichas da mesa (herdado do antigo CampaignCharactersList): a
  // RLS vale no canal também, então o Mestre só recebe evento das fichas que
  // ele já pode ler. Recarrega a lista inteira a cada evento — volume é baixo
  // (uma mesa, poucas fichas) e patch incremental seria over-engineering.
  //
  // Sem isto, a Mesa mostraria o HP de uma hora atrás enquanto o jogador
  // apanha na sessão.
  useEffect(() => {
    if (!campaign || userId == null) return
    const isDM = campaign.dm_id === userId
    const channel = supabase
      .channel(`campaign:${campaignId}:characters`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'characters', filter: `campaign_id=eq.${campaignId}` },
        () => { loadRoster(isDM) },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [campaignId, campaign, userId, loadRoster])

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

  async function performRemove() {
    const alvo = removeTarget
    if (!alvo) return
    setBusyMemberId(alvo)
    const r = await removeMember(campaignId, alvo)
    setBusyMemberId(null)
    setRemoveTarget(null)
    if (r.ok) reload()
  }

  async function performLeave() {
    setLeaving(true)
    const r = await leaveCampaign(campaignId)
    setLeaving(false)
    setLeaveOpen(false)
    if (r.ok) navigate('/campaigns')
  }

  async function performCloseEncounter() {
    if (!encounter?.id) return
    setClosingEncounter(true)
    const res = await closeEncounter(encounter.id)
    setClosingEncounter(false)
    if (res.ok) setEncounter(null)
  }

  if (loading) return <div className="p-6 text-ink-300 ink-italic text-sm">Carregando mesa…</div>
  if (!campaign) {
    return (
      <div className="p-6 flex flex-col gap-2 text-ink-500 text-sm">
        <p>Mesa não encontrada (ou sem permissão).</p>
        <Button variant="ghost" size="sm" onClick={onBack}>Voltar</Button>
      </div>
    )
  }

  const isDM = campaign.dm_id === userId
  const { rows, orphanCharacters } = mergeParty(members, characters, { currentUserId: userId })
  const removeAlvo = rows.find(r => r.userId === removeTarget)

  return (
    <div className="min-h-screen p-4 bg-parchment-100 text-ink-500">
      <header className="flex items-start justify-between gap-4 mb-6 max-w-4xl mx-auto">
        <div className="min-w-0">
          <button onClick={onBack} className="text-xs ink-italic text-ink-300 hover:text-ink-500">← Mesas</button>
          <div className="mt-1">
            <CampaignTitle
              campaignId={campaign.id}
              name={campaign.name}
              canRename={isDM}
              onRenamed={(name) => setCampaign(c => ({ ...c, name }))}
            />
          </div>
          <p className="text-xs ink-italic text-ink-300">{isDM ? 'Você é o Mestre' : 'Você é Jogador'}</p>
        </div>
        <AccountMenu />
      </header>

      <div className="max-w-4xl mx-auto grid gap-4">
        {isDM && (
          <EncounterStatusCard
            encounter={encounter}
            readFailed={encounterReadFailed}
            closing={closingEncounter}
            onRun={() => navigate(`/campaigns/${campaign.id}/combate`)}
            onLibrary={() => navigate(`/campaigns/${campaign.id}/encontros`)}
            onClose={performCloseEncounter}
          />
        )}

        <PartyList
          rows={rows}
          orphanCharacters={orphanCharacters}
          failure={charFailure}
          onRetry={() => loadRoster(isDM)}
          onOpenCharacter={isDM ? (openId => navigate(`/c/${openId}`)) : undefined}
          onRemoveMember={isDM ? (id => setRemoveTarget(id)) : undefined}
          onLeave={isDM ? undefined : () => setLeaveOpen(true)}
          busyMemberId={busyMemberId}
          leaving={leaving}
        />

        <details className="rounded-sm border-2 border-parchment-600 bg-parchment-50">
          <summary className="px-4 py-2 text-xs font-display uppercase tracking-widest text-ink-500 cursor-pointer">
            Convidar jogador
          </summary>
          <div className="border-t border-parchment-600">
            <InviteCodeBox
              campaignId={campaign.id}
              code={campaign.invite_code}
              isDM={isDM}
              onRotated={(code) => setCampaign(c => ({ ...c, invite_code: code }))}
            />
          </div>
        </details>

        {isDM && (
          <div className="mt-6 pt-4 border-t-2 border-parchment-600">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
            >
              Apagar mesa
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remover jogador?"
        message={removeAlvo
          ? `Remover ${removeAlvo.displayName} da mesa? O personagem vinculado volta a ser pessoal.`
          : 'Remover este jogador da mesa? O personagem vinculado volta a ser pessoal.'}
        confirmLabel="Remover"
        variant="danger"
        busy={!!busyMemberId}
        onConfirm={performRemove}
        onCancel={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={leaveOpen}
        title="Sair da mesa?"
        message="Sua ficha vinculada volta a ser pessoal. Você pode entrar de novo se tiver o código."
        confirmLabel="Sair"
        variant="danger"
        busy={leaving}
        onConfirm={performLeave}
        onCancel={() => setLeaveOpen(false)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Apagar mesa?"
        message={
          <>
            <p className="mb-2">
              Apagar a mesa <strong>"{campaign.name}"</strong>?
            </p>
            <p className="ink-italic text-ink-300">
              Os jogadores serão removidos e as fichas voltam a ser pessoais dos donos.
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
