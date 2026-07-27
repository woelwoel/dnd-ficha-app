import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getActiveEncounter, createEncounter, saveEncounterState,
  closeEncounter, subscribeEncounter,
} from '../../../../lib/encounters'
import { emptyEncounterState } from '../../domain/encounter'

/**
 * Dona da conversa com a tabela `encounters`: retoma (ou cria) o encontro ativo
 * da mesa, salva com lock otimista e escuta realtime — o Mestre pode ter o
 * celular na mesa e o notebook aberto.
 *
 * `update(fn)` recebe o state atual e devolve o novo (estilo setState).
 * Conflito de versão não sobrescreve: recarrega do servidor e liga `conflict`.
 */
export function useEncounter(campaignId) {
  const [row, setRow] = useState(null)
  const [state, setState] = useState(emptyEncounterState)
  const [loading, setLoading] = useState(true)
  const [conflict, setConflict] = useState(false)
  const versionRef = useRef(null)

  const adopt = useCallback((r) => {
    setRow(r)
    versionRef.current = r?.version ?? null
    setState(r?.state && Array.isArray(r.state.combatants) ? r.state : emptyEncounterState())
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      const existing = await getActiveEncounter(campaignId)
      if (!alive) return
      if (existing) { adopt(existing); setLoading(false); return }
      const created = await createEncounter(campaignId, emptyEncounterState())
      if (!alive) return
      if (created.ok) { adopt(created.row); setLoading(false); return }
      // getActiveEncounter devolve null também quando a LEITURA falhou. Nesse
      // caso a criação bate no índice único parcial da 0015 (um ativo por
      // mesa) — relemos e adotamos o encontro que já existia.
      const retry = await getActiveEncounter(campaignId)
      if (!alive) return
      if (retry) adopt(retry)
      setLoading(false)
    })()
    return () => { alive = false }
  }, [campaignId, adopt])

  useEffect(() => {
    if (!row?.id) return
    return subscribeEncounter(row.id, (fresh) => {
      // Ignora o eco do próprio save (versão que já conhecemos).
      if (fresh.version === versionRef.current) return
      adopt(fresh)
    })
  }, [row?.id, adopt])

  const update = useCallback(async (fn) => {
    if (!row?.id) return { ok: false, reason: 'no-encounter' }
    const next = fn(state)
    setState(next) // otimista: a mesa não pode travar esperando a rede
    const res = await saveEncounterState(row.id, next, versionRef.current)
    if (res.ok) { versionRef.current = res.version; setConflict(false); return res }
    if (res.reason === 'conflict') {
      const fresh = await getActiveEncounter(campaignId)
      if (fresh) adopt(fresh)
      setConflict(true)
    }
    return res
  }, [row?.id, state, campaignId, adopt])

  const close = useCallback(async () => {
    if (!row?.id) return { ok: true }
    const res = await closeEncounter(row.id)
    if (res.ok) { setRow(null); versionRef.current = null; setState(emptyEncounterState()) }
    return res
  }, [row?.id])

  return { state, update, close, loading, conflict, encounterId: row?.id ?? null }
}
