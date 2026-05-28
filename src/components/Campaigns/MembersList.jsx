import { useEffect, useState } from 'react'
import { listMembers, removeMember, leaveCampaign } from '../../lib/campaigns'
import { Button } from '../ui/Button'

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

  async function reload() {
    setLoading(true)
    setMembers(await listMembers(campaignId))
    setLoading(false)
  }
  useEffect(() => { reload() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [campaignId])

  async function onRemove(userId) {
    if (!confirm('Remover este jogador da mesa?')) return
    setBusyMember(userId)
    const r = await removeMember(campaignId, userId)
    setBusyMember(null)
    if (r.ok) { await reload(); onChanged?.() }
  }

  async function onLeave() {
    if (!confirm('Sair desta mesa?')) return
    setBusyLeave(true)
    const r = await leaveCampaign(campaignId)
    setBusyLeave(false)
    if (r.ok) onChanged?.({ left: true })
  }

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
                  onClick={() => onRemove(m.user_id)}
                >
                  {busyMember === m.user_id ? 'Removendo…' : 'Remover'}
                </Button>
              )}
              {!isDM && isSelf && (
                <Button variant="ghost-dark" size="sm" disabled={busyLeave} onClick={onLeave}>
                  {busyLeave ? 'Saindo…' : 'Sair'}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
