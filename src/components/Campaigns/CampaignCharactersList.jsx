import { useCallback, useEffect, useState } from 'react'
import { fetchCampaignCharacters } from '../../lib/campaigns'
import { supabase } from '../../lib/supabase'

/**
 * Lista de fichas dos jogadores vinculadas a uma mesa. RLS já garante que
 * apenas o DM da mesa enxerga via `characters_select_own_or_dm_of_campaign`.
 * Clicar abre a CharacterSheet — modo readonly é detectado lá pela diferença
 * entre `character.ownerId` e o usuário corrente (Task 7).
 */
export function CampaignCharactersList({ campaignId, onOpen }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  // Lista vazia por falha de leitura é indistinguível de mesa sem fichas — e
  // dizer "nenhum jogador criou ficha" quando na verdade a query morreu já
  // escondeu um bug de schema por semanas. Guardamos a falha e mostramos.
  const [failure, setFailure] = useState(null)

  const reload = useCallback(() => {
    setLoading(true)
    return fetchCampaignCharacters(campaignId).then(res => {
      if (res.ok) {
        setRows(res.rows)
        setFailure(null)
      } else {
        setFailure(res)
      }
      setLoading(false)
    })
  }, [campaignId])

  useEffect(() => {
    let alive = true
    reload().then(() => { if (!alive) return })
    return () => { alive = false }
  }, [reload])

  // #41 super review: subscribe a UPDATE/INSERT/DELETE em characters dessa
  // mesa. RLS no Realtime: o channel só emite linhas que o user pode ler,
  // então DM só recebe eventos dos players da própria mesa.
  // Estratégia: reload completo a cada evento. Volume baixo (1 mesa,
  // poucas fichas) — patch incremental seria over-engineering.
  useEffect(() => {
    const channel = supabase
      .channel(`campaign:${campaignId}:characters`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'characters', filter: `campaign_id=eq.${campaignId}` },
        () => { reload() },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [campaignId, reload])

  if (loading) return <div className="p-4 text-ink-300 ink-italic text-sm">Carregando fichas…</div>

  return (
    <div className="rounded-sm border-2 border-parchment-600 bg-parchment-50 shadow-parchment-sm overflow-hidden">
      <div className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100">
        Fichas dos jogadores {failure ? '' : `(${rows.length}) `}— modo leitura
      </div>
      {failure ? (
        <div className="p-4 flex flex-col items-start gap-2">
          <p role="alert" className="text-sm text-red-700">
            Não foi possível carregar as fichas desta mesa.
            {failure.message && (
              <span className="block mt-1 text-xs ink-italic text-ink-300">{failure.message}</span>
            )}
          </p>
          <button
            type="button"
            onClick={reload}
            className="text-xs font-display tracking-wide uppercase px-3 py-1 border-2 border-parchment-600 rounded-sm text-ink-500 hover:bg-parchment-200 transition"
          >
            Tentar de novo
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="p-4 text-ink-300 ink-italic text-sm">Nenhum jogador criou ficha vinculada à mesa ainda.</p>
      ) : (
        <ul className="divide-y divide-parchment-600">
          {rows.map(r => (
            <li key={r.id}>
              <button
                onClick={() => onOpen(r.short_id ?? r.id)}
                className="w-full text-left px-4 py-2 hover:bg-parchment-200 transition flex items-center justify-between"
              >
                <span className="text-ink-500 font-display tracking-wide">{r.data?.info?.name ?? '(sem nome)'}</span>
                <span className="text-xs ink-italic text-ink-300">
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
