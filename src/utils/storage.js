import { safeParseCharacter } from '../domain/characterSchema'

const STORAGE_KEY = 'dnd-app-characters'
const CURRENT_VERSION = '1.0'

/* ── Primitivas seguras sobre localStorage ───────────────────────── */

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return { ok: true }
  } catch (err) {
    const reason = err?.name === 'QuotaExceededError' ? 'quota' : 'unknown'
    if (import.meta.env.DEV) console.error('[storage] falha ao salvar:', err)
    return { ok: false, reason }
  }
}

/* ── Migração ────────────────────────────────────────────────────── */

function migrate(character) {
  if (character?.meta?.version === CURRENT_VERSION) return character
  // Espaço para migrações futuras (1.0 → 1.1, etc.)
  return {
    ...character,
    meta: { ...(character?.meta ?? {}), version: CURRENT_VERSION },
  }
}

/* ── API pública ─────────────────────────────────────────────────── */

export function loadCharacters() {
  const data = safeGet(STORAGE_KEY, [])
  if (!Array.isArray(data)) return []

  const valid = []
  for (const raw of data) {
    const migrated = migrate(raw)
    const parsed = safeParseCharacter(migrated)
    if (parsed.success) valid.push(parsed.data)
    else if (import.meta.env.DEV) {
      console.warn('[storage] personagem ignorado (schema inválido):', parsed.error.issues)
    }
  }
  return valid
}

export function saveCharacters(characters) {
  return safeSet(STORAGE_KEY, characters)
}

export function loadCharacterById(id) {
  return loadCharacters().find(c => c.id === id) ?? null
}

export function upsertCharacter(character) {
  const all = loadCharacters()
  const idx = all.findIndex(c => c.id === character.id)
  if (idx >= 0) all[idx] = character
  else all.push(character)
  return safeSet(STORAGE_KEY, all)
}

export function deleteCharacter(id) {
  const all = loadCharacters().filter(c => c.id !== id)
  return safeSet(STORAGE_KEY, all)
}
