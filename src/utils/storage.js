import { safeParseCharacter, migrateCharacter } from '../domain/characterSchema'

const STORAGE_KEY = 'dnd-app-characters'
const CURRENT_VERSION = '1.0'

/* ── Primitivas seguras sobre localStorage ───────────────────────── */

function safeGet(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function safeSet(key, value) {
  try {
    if (typeof localStorage === 'undefined') return { ok: false, reason: 'no-storage' }
    localStorage.setItem(key, JSON.stringify(value))
    return { ok: true }
  } catch (err) {
    const reason = err?.name === 'QuotaExceededError' ? 'quota' : 'unknown'
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.error('[storage] falha ao salvar:', err)
    }
    return { ok: false, reason }
  }
}

/* ── Wrappers do Zod ─────────────────────────────────────────────── */

/**
 * Valida via Zod, devolvendo `{ ok, data, errors }`. Migrações são aplicadas
 * antes da validação. Em caso de falha, NÃO persiste.
 */
function validateForSave(character) {
  const migrated = migrateCharacter(character)
  // Carimba `meta.version` do storage (separado de schemaVersion).
  const stamped = {
    ...migrated,
    meta: { ...(migrated?.meta ?? {}), version: CURRENT_VERSION },
  }
  const result = safeParseCharacter(stamped)
  if (!result.success) {
    return { ok: false, errors: result.error.issues }
  }
  return { ok: true, data: result.data }
}

/* ── API pública ─────────────────────────────────────────────────── */

export function loadCharacters() {
  const data = safeGet(STORAGE_KEY, [])
  if (!Array.isArray(data)) return []
  const valid = []
  for (const raw of data) {
    const parsed = safeParseCharacter(raw)
    if (parsed.success) valid.push(parsed.data)
    else if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.warn('[storage] personagem ignorado (schema inválido):',
        parsed.error.issues.slice(0, 3))
    }
  }
  return valid
}

/**
 * Salva o array completo de personagens (cada um validado individualmente).
 * Personagens inválidos são REMOVIDOS do payload salvo (com warning em dev).
 */
export function saveCharacters(characters) {
  const valid = []
  for (const ch of characters ?? []) {
    const v = validateForSave(ch)
    if (v.ok) valid.push(v.data)
    else if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.warn('[storage] personagem inválido descartado:', v.errors.slice(0, 3))
    }
  }
  return safeSet(STORAGE_KEY, valid)
}

export function loadCharacterById(id) {
  return loadCharacters().find(c => c.id === id) ?? null
}

/**
 * Insere ou atualiza UM personagem. Retorna `{ ok, errors? }` — em caso de
 * `errors`, o storage NÃO foi tocado.
 */
export function upsertCharacter(character) {
  const v = validateForSave(character)
  if (!v.ok) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      console.error('[storage] tentativa de salvar ficha inválida:', v.errors)
    }
    return { ok: false, reason: 'invalid', errors: v.errors }
  }
  const all = loadCharacters()
  const idx = all.findIndex(c => c.id === v.data.id)
  if (idx >= 0) all[idx] = v.data
  else all.push(v.data)
  return safeSet(STORAGE_KEY, all)
}

export function deleteCharacter(id) {
  const all = loadCharacters().filter(c => c.id !== id)
  return safeSet(STORAGE_KEY, all)
}
