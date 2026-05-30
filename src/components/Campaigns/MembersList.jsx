import { useEffect, useState } from 'react'
import { listMembers, removeMember, leaveCampaign } from '../../lib/campaigns'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'

/**
 * Lista de membros da mesa. DM pode remover qualquer player; player pode sair.
 * DM não pode "sair" — pra deixar a mesa, precisa apagá-la (vem em PR futuro).
 */
export function MembersList({ campaignId, currentUserId, isDM, onChanged }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  // #26 super review: spinner em ações destrutivas.
  // busyMember = user_id sendo removido; busyLeave = leave em vôo.
  const [busyMember, setBusyMember] = useState(null)
  const [busyLeave, setBusyLeave] = useState(false)
  // Confirmação tematizada (substitui window.confirm nativo).
  const [removeTarget, setRemoveTarget] = useState(null) // user_id a remover
  const [leaveOpen, setLeaveOpen] = useState(false)

  async function reload() {
    setLoading(true)
    setMembers(await listMembers(campaignId))
    setLoading(false)
  }
  useEffect(() => { reload() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [campaignId])

  async function performRemove() {
    const userId = removeTarget
    if (!userId) return
    setBusyMember(userId)
    const r = await removeMember(campaignId, userId)
    setBusyMember(null)
    setRemoveTarget(null)
    if (r.ok) { await reload(); onChanged?.() }
  }

  async function performLeave() {
    setBusyLeave(true)
    const r = await leaveCampaign(campaignId)
    setBusyLeave(false)
    setLeaveOpen(false)
    if (r.ok) onChanged?.({ left: true })
  }

  const targetMember = members.find(m => m.user_id === removeTarget)
  const targetName = targetMember?.profiles?.display_name?.trim()
    || (targetMember ? `${targetMember.user_id.slice(0, 8)}…` : '')

  if (loading) return <p className="text-amber-400 text-sm p-4">Carregando membros…</p>

  return (
    <div className="rounded border border-shell-border bg-gray-900">
      <div className="px-4 py-2 text-xs uppercase tracking-wider text-gray-400 border-b border-shell-border">
        Membros ({members.length})
      </div>
      <ul className="divide-y divide-shell-border">
        {members.map(m => {
          const isSelf = m.user_id === currentUserId
          return (
            <li key={m.user_id} className="flex items-center justify-between px-4 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                {m.profiles?.avatar_url && (
                  <img
                    src={m.profiles.avatar_url}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                )}
                <span className="text-gray-200 truncate">
                  {isSelf
                    ? 'Você'
                    : (m.profiles?.display_name?.trim() || `${m.user_id.slice(0, 8)}…`)}
                </span>
                <span className="ml-2 text-xs uppercase text-gray-500 shrink-0">
                  {m.role === 'dm' ? 'Mestre' : 'Jogador'}
                </span>
              </div>
              {isDM && !isSelf && (
                <Button
                  variant="ghost-dark"
                  size="sm"
                  disabled={busyMember === m.user_id}
                  onClick={() => setRemoveTarget(m.user_id)}
                >
                  {busyMember === m.user_id ? 'Removendo…' : 'Remover'}
                </Button>
              )}
              {!isDM && isSelf && (
                <Button variant="ghost-dark" size="sm" disabled={busyLeave} onClick={() => setLeaveOpen(true)}>
                  {busyLeave ? 'Saindo…' : 'Sair'}
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remover jogador?"
        message={targetName
          ? `Remover ${targetName} da mesa? O personagem vinculado volta a ser pessoal.`
          : 'Remover este jogador da mesa? O personagem vinculado volta a ser pessoal.'}
        confirmLabel="Remover"
        variant="danger"
        busy={!!busyMember}
        onConfirm={performRemove}
        onCancel={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={leaveOpen}
        title="Sair da mesa?"
        message="Sua ficha vinculada volta a ser pessoal. Você pode entrar de novo se tiver o código."
        confirmLabel="Sair"
        variant="danger"
        busy={busyLeave}
        onConfirm={performLeave}
        onCancel={() => setLeaveOpen(false)}
      />
    </div>
  )
}
