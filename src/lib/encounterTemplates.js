import { supabase } from './supabase'

/**
 * Encontros salvos por mesa (migration 0017). Camada da CASCA: não conhece o
 * shape de `monsters` — pra ela é jsonb opaco. Quem interpreta é o sistema.
 *
 * Sem lock otimista de propósito: template é editado por uma pessoa, fora da
 * sessão, e o custo de um conflito é reescrever um nome.
 */
const T = 'encounter_templates'
export const NAME_MAX = 80

function logDev(label, payload) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[encounterTemplates] ${label}:`, payload)
  }
}

/** Mesma regra do check da 0017 — validar aqui evita ida inútil ao servidor. */
function cleanName(name) {
  const trimmed = String(name ?? '').trim()
  return trimmed.length >= 1 && trimmed.length <= NAME_MAX ? trimmed : null
}

function reasonFor(error) {
  if (error?.code === '23505') return 'duplicate-name'
  if (error?.code === '23514') return 'invalid-name'
  return 'unknown'
}

export async function listTemplates(campaignId) {
  const { data, error } = await supabase
    .from(T)
    .select('*')
    .eq('campaign_id', campaignId)
    .order('name', { ascending: true })
  if (error) { logDev('listTemplates', error); return [] }
  return data ?? []
}

export async function createTemplate(campaignId, name, monsters) {
  const clean = cleanName(name)
  if (!clean) return { ok: false, reason: 'invalid-name' }
  const { data, error } = await supabase
    .from(T)
    .insert({ campaign_id: campaignId, name: clean, monsters: monsters ?? [] })
    .select('*')
    .single()
  if (error) {
    logDev('createTemplate', error)
    return { ok: false, reason: reasonFor(error), message: error.message }
  }
  return { ok: true, row: data }
}

export async function updateTemplate(id, { name, monsters } = {}) {
  const patch = {}
  if (name !== undefined) {
    const clean = cleanName(name)
    if (!clean) return { ok: false, reason: 'invalid-name' }
    patch.name = clean
  }
  if (monsters !== undefined) patch.monsters = monsters ?? []
  if (Object.keys(patch).length === 0) return { ok: true }

  const { data, error } = await supabase
    .from(T).update(patch).eq('id', id).select('id').maybeSingle()
  if (error) {
    logDev('updateTemplate', error)
    return { ok: false, reason: reasonFor(error), message: error.message }
  }
  // Nenhuma linha voltou: o template sumiu (outra aba apagou) ou a RLS barrou.
  // Devolver ok aqui faria o Mestre achar que salvou o que não foi salvo.
  if (!data) return { ok: false, reason: 'not-found' }
  return { ok: true }
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from(T).delete().eq('id', id)
  if (error) { logDev('deleteTemplate', error); return { ok: false, reason: 'unknown' } }
  return { ok: true }
}
