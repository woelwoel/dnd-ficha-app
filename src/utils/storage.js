import { safeParseCharacter, migrateCharacter } from '../domain/characterSchema'
import { clampPosition } from './token-position'
import { supabase } from '../lib/supabase'

const TABLE = 'characters'
const CURRENT_VERSION = '1.0'

/* ── Helpers ─────────────────────────────────────────────────────── */

function validateForSave(character) {
  const migrated = migrateCharacter(character)
  const stamped = {
    ...migrated,
    meta: { ...(migrated?.meta ?? {}), version: CURRENT_VERSION },
  }
  const result = safeParseCharacter(stamped)
  if (!result.success) return { ok: false, errors: result.error.issues }
  return { ok: true, data: result.data }
}

// Formato de short_id: 10 chars do alfabeto sem ambíguos (gerado server-side
// na trigger characters_set_short_id). Antes da migration 0003 ser aplicada,
// row.short_id pode ser undefined — tratado como null.
const SHORT_ID_REGEX = /^[A-HJ-NP-Za-hj-km-np-z2-9]{10}$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function rowToCharacter(row) {
  // O payload da ficha vive em row.data. last_opened_at e short_id são
  // metadados relacionais.
  if (!row?.data) return null
  return {
    ...row.data,
    shortId: row.short_id ?? null,
    lastOpenedAt: row.last_opened_at ? Date.parse(row.last_opened_at) : (row.data.lastOpenedAt ?? null),
  }
}

function logDev(label, payload) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[storage] ${label}:`, payload)
  }
}

/* ── API pública ─────────────────────────────────────────────────── */

export async function loadCharacters() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, data, last_opened_at, created_at, short_id')
    .order('created_at', { ascending: true })
  if (error) {
    logDev('loadCharacters falhou', error)
    return []
  }
  const valid = []
  for (const row of data ?? []) {
    const ch = rowToCharacter(row)
    const parsed = safeParseCharacter(ch)
    if (parsed.success) valid.push(parsed.data)
    else logDev('ficha ignorada (schema)', parsed.error.issues.slice(0, 3))
  }
  return valid
}

export async function loadCharacterById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, data, last_opened_at, short_id')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  const ch = rowToCharacter(data)
  const parsed = safeParseCharacter(ch)
  return parsed.success ? parsed.data : null
}

/**
 * Aceita o parâmetro de URL (`:idOrShort`) e busca por UUID OU short_id,
 * permitindo links antigos (UUID) continuarem funcionando após a migração
 * para short_id. Caracteres ambíguos (0/O, 1/I/l) são rejeitados pra short_id.
 */
export async function loadCharacterByRouteParam(routeParam) {
  if (!routeParam) return null
  const column = UUID_REGEX.test(routeParam) ? 'id'
    : SHORT_ID_REGEX.test(routeParam) ? 'short_id'
    : null
  if (!column) return null
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, data, last_opened_at, short_id')
    .eq(column, routeParam)
    .maybeSingle()
  if (error || !data) return null
  const ch = rowToCharacter(data)
  const parsed = safeParseCharacter(ch)
  return parsed.success ? parsed.data : null
}

export async function upsertCharacter(character) {
  const v = validateForSave(character)
  if (!v.ok) {
    logDev('upsert: ficha inválida', v.errors.slice(0, 3))
    return { ok: false, reason: 'invalid', errors: v.errors }
  }
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({
      id: v.data.id,
      data: v.data,
      last_opened_at: v.data.lastOpenedAt ? new Date(v.data.lastOpenedAt).toISOString() : null,
    })
    .select('short_id')
    .maybeSingle()
  if (error) {
    logDev('upsert falhou', error)
    return { ok: false, reason: error.message?.includes('character_limit_reached') ? 'limit' : 'unknown' }
  }
  return { ok: true, shortId: data?.short_id ?? null }
}

export async function deleteCharacter(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) {
    logDev('delete falhou', error)
    return { ok: false, reason: 'unknown' }
  }
  return { ok: true }
}

export async function updateCharacterPosition(id, position) {
  const { error } = await supabase.rpc('update_character_position', {
    p_id: id,
    p_position: clampPosition(position),
  })
  if (error) {
    logDev('updatePosition falhou', error)
    return { ok: false, reason: 'unknown' }
  }
  return { ok: true }
}

export async function touchCharacterLastOpened(id) {
  const { error } = await supabase.rpc('touch_character_last_opened', { p_id: id })
  if (error) return { ok: false, reason: 'unknown' }
  return { ok: true }
}

export async function exportAllCharacters() {
  const characters = await loadCharacters()
  return {
    app: 'dnd-ficha-app',
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    count: characters.length,
    characters,
  }
}

export async function importAllCharacters(rawPayload, mode = 'merge') {
  const list = Array.isArray(rawPayload)
    ? rawPayload
    : Array.isArray(rawPayload?.characters)
      ? rawPayload.characters
      : null

  if (!list) return { ok: false, reason: 'invalid-format', imported: 0, invalid: 0, total: 0 }

  // Pré-valida antes de tocar no servidor (evita inserts parciais em payload ruim)
  const valid = []
  let invalid = 0
  for (const raw of list) {
    const v = validateForSave(raw)
    if (v.ok) valid.push(v.data)
    else invalid += 1
  }
  if (valid.length === 0) {
    return { ok: false, reason: 'no-valid-characters', imported: 0, invalid, total: list.length }
  }

  if (mode === 'replace') {
    // Apaga tudo do usuário antes
    const current = await loadCharacters()
    for (const c of current) {
      const r = await deleteCharacter(c.id)
      if (!r.ok) return { ok: false, reason: r.reason ?? 'save-failed', imported: 0, invalid, total: list.length }
    }
  }

  let imported = 0
  for (const c of valid) {
    const r = await upsertCharacter(c)
    if (!r.ok) return { ok: false, reason: r.reason ?? 'save-failed', imported, invalid, total: list.length }
    imported += 1
  }

  return { ok: true, imported, invalid, total: list.length }
}
