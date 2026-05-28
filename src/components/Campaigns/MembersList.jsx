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

  async function reload() {
    setLoading(true)
    setMembers(await listMembers(campaignId))
    setLoading(false)
  }
  useEffect(() => { reload() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [campaignId])

  async function onRemove(userId) {
    if (!confirm('Remover este jogador da mesa?')) return
    const r = await removeMember(campaignId, userId)
    if (r.ok) { await reload(); onChanged?.() }
  }

  async function onLeave() {
    if (!confirm('Sair desta mesa?')) return
    const r = await leaveCampaign(campaignId)
    if (r.ok) onChanged?.({ left: true })
  }

  if (loading) return <p className="text-amber-400 text-sm p-4">Carregando membros…</p>

  return (
    <div className="rounded border bg-gray-900" style={{ borderColor: 'var(--color-shell-border)' }}>
      <div
        className="px-4 py-2 text-xs uppercase tracking-wider text-gray-400 border-b"
        style={{ borderColor: 'var(--color-shell-border)' }}
      >
        Membros ({members.length})
      </div>
      <ul className="divide-y" style={{ borderColor: 'var(--color-shell-border)' }}>
        {members.map(m => {
          const isSelf = m.user_id === currentUserId
          return (
            <li key={m.user_id} className="flex items-center justify-between px-4 py-2 text-sm">
              <div>
                <span className="text-gray-200">{isSelf ? 'Você' : `${m.user_id.slice(0, 8)}…`}</span>
                <span className="ml-2 text-xs uppercase text-gray-500">
                  {m.role === 'dm' ? 'Mestre' : 'Jogador'}
                </span>
              </div>
              {isDM && !isSelf && (
                <Button variant="ghost-dark" size="sm" onClick={() => onRemove(m.user_id)}>Remover</Button>
              )}
              {!isDM && isSelf && (
                <Button variant="ghost-dark" size="sm" onClick={onLeave}>Sair</Button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
