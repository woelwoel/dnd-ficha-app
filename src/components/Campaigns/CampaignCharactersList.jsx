import { useEffect, useState } from 'react'
import { loadCampaignCharacters } from '../../lib/campaigns'

/**
 * Lista de fichas dos jogadores vinculadas a uma mesa. RLS já garante que
 * apenas o DM da mesa enxerga via `characters_select_own_or_dm_of_campaign`.
 * Clicar abre a CharacterSheet — modo readonly é detectado lá pela diferença
 * entre `character.ownerId` e o usuário corrente (Task 7).
 */
export function CampaignCharactersList({ campaignId, onOpen }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    loadCampaignCharacters(campaignId).then(list => {
      if (!alive) return
      setRows(list)
      setLoading(false)
    })
    return () => { alive = false }
  }, [campaignId])

  if (loading) return <div className="p-4 text-amber-400 text-sm">Carregando fichas…</div>

  return (
    <div className="rounded border bg-gray-900" style={{ borderColor: 'var(--color-shell-border)' }}>
      <div
        className="px-4 py-2 text-xs uppercase tracking-wider text-gray-400 border-b"
        style={{ borderColor: 'var(--color-shell-border)' }}
      >
        Fichas dos jogadores ({rows.length}) — modo leitura
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-gray-500 text-sm">Nenhum jogador criou ficha vinculada à mesa ainda.</p>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--color-shell-border)' }}>
          {rows.map(r => (
            <li key={r.id}>
              <button
                onClick={() => onOpen(r.short_id ?? r.id)}
                className="w-full text-left px-4 py-2 hover:bg-gray-800 transition flex items-center justify-between"
              >
                <span className="text-amber-300">{r.data?.info?.name ?? '(sem nome)'}</span>
                <span className="text-xs text-gray-500">
                  {r.data?.info?.race} {r.data?.info?.class} — Nv {r.data?.info?.level}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
