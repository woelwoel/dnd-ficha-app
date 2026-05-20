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

function rowToCharacter(row) {
  // O payload da ficha vive em row.data. last_opened_at é metadado relacional.
  if (!row?.data) return null
  return {
    ...row.data,
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
    .select('id, data, last_opened_at, created_at')
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
    .select('id, data, last_opened_at')
    .eq('id', id)
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
  const { error } = await supabase
    .from(TABLE)
    .upsert({
      id: v.data.id,
      data: v.data,
      last_opened_at: v.data.lastOpenedAt ? new Date(v.data.lastOpenedAt).toISOString() : null,
    })
  if (error) {
    logDev('upsert falhou', error)
    return { ok: false, reason: error.message?.includes('character_limit_reached') ? 'limit' : 'unknown' }
  }
  return { ok: true }
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
