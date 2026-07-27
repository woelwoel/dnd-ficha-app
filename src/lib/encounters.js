import { supabase } from './supabase'

/**
 * Acesso à tabela `encounters` (migration 0015). Camada da CASCA: não conhece
 * o shape do `state` — quem monta e interpreta é o sistema (dnd5e). RLS já
 * garante que só o Mestre da mesa lê e escreve.
 */
const T = 'encounters'

function logDev(label, payload) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[encounters] ${label}:`, payload)
  }
}

/** Encontro ativo da mesa, ou null. */
export async function getActiveEncounter(campaignId) {
  const { data, error } = await supabase
    .from(T)
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('active', true)
    .maybeSingle()
  if (error) { logDev('getActiveEncounter', error); return null }
  return data ?? null
}

export async function createEncounter(campaignId, state) {
  const { data, error } = await supabase
    .from(T)
    .insert({ campaign_id: campaignId, state })
    .select('*')
    .single()
  if (error) {
    logDev('createEncounter', error)
    return { ok: false, reason: 'unknown', message: error.message }
  }
  return { ok: true, row: data }
}

/**
 * Lock otimista sem RPC: o UPDATE só pega a linha se a `version` casar, e o
 * trigger de 0015 devolve a versão já incrementada.
 */
export async function saveEncounterState(id, state, expectedVersion) {
  const { data, error } = await supabase
    .from(T)
    .update({ state })
    .eq('id', id)
    .eq('version', expectedVersion)
    .select('version')
    .maybeSingle()
  if (error) { logDev('saveEncounterState', error); return { ok: false, reason: 'unknown' } }
  if (!data) return { ok: false, reason: 'conflict' }
  return { ok: true, version: data.version }
}

export async function closeEncounter(id) {
  const { error } = await supabase.from(T).update({ active: false }).eq('id', id)
  if (error) { logDev('closeEncounter', error); return { ok: false, reason: 'unknown' } }
  return { ok: true }
}

/**
 * Realtime do encontro — o Mestre pode ter duas telas abertas (celular na mesa
 * e notebook). Devolve a função de unsubscribe.
 */
export function subscribeEncounter(id, onRow) {
  const channel = supabase
    .channel(`encounter:${id}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'encounters', filter: `id=eq.${id}` },
      payload => onRow(payload.new),
    )
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}
