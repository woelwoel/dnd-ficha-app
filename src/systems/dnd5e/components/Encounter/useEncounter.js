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
  // Espelha o `state` mais recente pra `update` compor sobre ele em vez da
  // variável capturada na closure — dois toques rápidos (dois `update` antes
  // do primeiro render) precisam compor em cima um do outro, não descartar.
  const stateRef = useRef(state)

  const adopt = useCallback((r) => {
    setRow(r)
    versionRef.current = r?.version ?? null
    const next = r?.state && Array.isArray(r.state.combatants) ? r.state : emptyEncounterState()
    stateRef.current = next
    setState(next)
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
      // Só adota versão MAIOR que a conhecida: descarta o eco do próprio save
      // (mesma versão) e qualquer evento atrasado que chegue fora de ordem
      // (versão menor) — com `===` um evento assim faria o state regredir.
      const known = versionRef.current
      if (known != null && fresh.version <= known) return
      adopt(fresh)
    })
  }, [row?.id, adopt])

  const update = useCallback(async (fn) => {
    if (!row?.id) return { ok: false, reason: 'no-encounter' }
    // Compõe sobre o ref (o mais recente), não sobre a `state` da closure —
    // duas chamadas disparadas em sequência sem esperar a primeira precisam
    // compor uma sobre a outra no cliente.
    const next = fn(stateRef.current)
    const versionUsed = versionRef.current
    stateRef.current = next
    setState(next) // otimista: a mesa não pode travar esperando a rede
    const res = await saveEncounterState(row.id, next, versionUsed)
    if (res.ok) { versionRef.current = res.version; setConflict(false); return res }
    if (res.reason === 'conflict') {
      // Segundo `update` disparado antes da resposta do primeiro manda a
      // versão velha e leva conflito de propósito — recarrega do servidor.
      // Não serializamos as chamadas nem criamos fila; é o comportamento
      // desenhado.
      const fresh = await getActiveEncounter(campaignId)
      if (fresh) adopt(fresh)
      setConflict(true)
    }
    return res
  }, [row?.id, campaignId, adopt])

  const close = useCallback(async () => {
    if (!row?.id) return { ok: true }
    const res = await closeEncounter(row.id)
    if (res.ok) {
      setRow(null)
      versionRef.current = null
      stateRef.current = emptyEncounterState()
      setState(stateRef.current)
      setConflict(false)
    }
    return res
  }, [row?.id])

  return { state, update, close, loading, conflict, encounterId: row?.id ?? null }
}
