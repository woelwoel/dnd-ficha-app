import { safeParseCharacter, migrateCharacter } from '../domain/characterSchema'
import { clampPosition } from './token-position'

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

/**
 * Atualiza somente `character.position` (sem revalidar todo o documento).
 * Posição passa por clampPosition (faixa [0,1] + grid).
 */
export function updateCharacterPosition(id, position) {
  const all = loadCharacters()
  const idx = all.findIndex(c => c.id === id)
  if (idx < 0) return { ok: false, reason: 'not-found' }
  const next = {
    ...all[idx],
    position: clampPosition(position),
  }
  all[idx] = next
  return safeSet(STORAGE_KEY, all)
}

/**
 * Empacota todos os personagens válidos num payload de backup com
 * metadados (versão, data, contagem) para export como arquivo JSON.
 */
export function exportAllCharacters() {
  const characters = loadCharacters()
  return {
    app: 'dnd-ficha-app',
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    count: characters.length,
    characters,
  }
}

/**
 * Aceita um payload bruto vindo de arquivo JSON e tenta importar.
 *
 * `mode`:
 *   - 'replace' → substitui TUDO pelos personagens do backup
 *   - 'merge'   → mantém os atuais; sobrescreve quando id colidir;
 *                 adiciona novos por id ausente
 *
 * Retorna `{ ok, imported, invalid, total, reason? }`.
 * Em caso de payload irreconhecível, NÃO toca o storage.
 */
export function importAllCharacters(rawPayload, mode = 'merge') {
  const list = Array.isArray(rawPayload)
    ? rawPayload
    : Array.isArray(rawPayload?.characters)
      ? rawPayload.characters
      : null

  if (!list) return { ok: false, reason: 'invalid-format', imported: 0, invalid: 0, total: 0 }

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

  let merged
  if (mode === 'replace') {
    merged = valid
  } else {
    const current = loadCharacters()
    const byId = new Map(current.map(c => [c.id, c]))
    for (const c of valid) byId.set(c.id, c)
    merged = Array.from(byId.values())
  }

  const result = safeSet(STORAGE_KEY, merged)
  if (!result.ok) return { ok: false, reason: result.reason ?? 'save-failed', imported: 0, invalid, total: list.length }

  return { ok: true, imported: valid.length, invalid, total: list.length }
}

/**
 * Marca o personagem como aberto agora — grava lastOpenedAt em epoch ms.
 */
export function touchCharacterLastOpened(id) {
  const all = loadCharacters()
  const idx = all.findIndex(c => c.id === id)
  if (idx < 0) return { ok: false, reason: 'not-found' }
  all[idx] = { ...all[idx], lastOpenedAt: Date.now() }
  return safeSet(STORAGE_KEY, all)
}
