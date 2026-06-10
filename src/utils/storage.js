import { safeParseCharacter, migrateCharacter } from '../domain/characterSchema'
import { clampPosition } from './token-position'
import { supabase } from '../lib/supabase'
import { reportError } from '../lib/report'

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
  // O payload da ficha vive em row.data. Outros campos (owner_id, campaign_id,
  // short_id, last_opened_at) são metadados relacionais e são espelhados no
  // objeto pra que o cliente possa consultar sem fazer outra query.
  if (!row?.data) return null
  return {
    ...row.data,
    shortId: row.short_id ?? null,
    ownerId: row.owner_id ?? row.data.ownerId ?? null,
    campaignId: row.campaign_id ?? row.data.campaignId ?? null,
    lastOpenedAt: row.last_opened_at ? Date.parse(row.last_opened_at) : (row.data.lastOpenedAt ?? null),
  }
}

function logDev(label, payload) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[storage] ${label}:`, payload)
  }
}

/* ── API pública ─────────────────────────────────────────────────── */

/**
 * Carrega fichas com filtro opcional por escopo:
 *   - 'mine' (default)            → todas que o user pode ver (owner + DM)
 *   - 'personal'                  → só com campaign_id IS NULL
 *   - { campaignId: '<uuid>' }    → só dessa mesa
 */
export async function loadCharacters(scope = 'mine') {
  let q = supabase
    .from(TABLE)
    .select('id, data, last_opened_at, created_at, short_id, owner_id, campaign_id')
    .order('created_at', { ascending: true })

  if (scope === 'personal') q = q.is('campaign_id', null)
  else if (scope && typeof scope === 'object' && scope.campaignId) q = q.eq('campaign_id', scope.campaignId)

  const { data, error } = await q
  if (error) {
    logDev('loadCharacters falhou', error)
    return []
  }
  const valid = []
  let rejected = 0
  for (const row of data ?? []) {
    const ch = rowToCharacter(row)
    const parsed = safeParseCharacter(ch)
    if (parsed.success) valid.push(parsed.data)
    else {
      rejected += 1
      logDev('ficha ignorada (schema)', parsed.error.issues.slice(0, 3))
    }
  }
  // Sem telemetria, um bump de SCHEMA_VERSION com migração bugada faria fichas
  // "sumirem" em prod sem rastro. reportError é no-op silencioso em DEV.
  if (rejected > 0) {
    reportError('character_schema_rejected', new Error(`${rejected} ficha(s) rejeitada(s) no parse`), {
      rejected,
      total: (data ?? []).length,
    })
  }
  return valid
}

// owner_id + campaign_id são colunas relacionais (stripadas do JSONB pelo
// Batch F #29). Precisam estar no SELECT pra rowToCharacter conseguir
// expor ownerId/campaignId no objeto — sem isso, ownerId vira null no
// cliente e a detecção de readOnly (DM lendo ficha de player) falha.
const CHARACTER_COLUMNS = 'id, data, last_opened_at, short_id, owner_id, campaign_id'

export async function loadCharacterById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(CHARACTER_COLUMNS)
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
    .select(CHARACTER_COLUMNS)
    .eq(column, routeParam)
    .maybeSingle()
  if (error || !data) return null
  const ch = rowToCharacter(data)
  const parsed = safeParseCharacter(ch)
  return parsed.success ? parsed.data : null
}

export async function upsertCharacter(character, opts = {}) {
  const v = validateForSave(character)
  if (!v.ok) {
    logDev('upsert: ficha inválida', v.errors.slice(0, 3))
    return { ok: false, reason: 'invalid', errors: v.errors }
  }
  // #29 super review: ownerId/campaignId vivem como colunas relacionais;
  // não devem ser persistidos dentro do JSONB `data`. Strip antes de salvar
  // pra evitar divergência entre coluna e JSON em mudanças futuras.
  const { ownerId: _omitOwnerId, campaignId: _omitCampaignId, ...dataToSave } = v.data
  void _omitOwnerId; void _omitCampaignId

  const baseRow = {
    id: v.data.id,
    data: dataToSave,
    last_opened_at: v.data.lastOpenedAt ? new Date(v.data.lastOpenedAt).toISOString() : null,
  }
  // campaignId pode vir como override em opts (criação no contexto de mesa)
  // ou já no objeto character (replays). null = explicitamente pessoal.
  let campaignIdForSave
  if (opts.campaignId !== undefined) campaignIdForSave = opts.campaignId
  else if (character.campaignId !== undefined) campaignIdForSave = character.campaignId

  const row = campaignIdForSave === undefined
    ? baseRow
    : { ...baseRow, campaign_id: campaignIdForSave }

  let { data, error } = await supabase
    .from(TABLE)
    .upsert(row)
    .select('short_id, campaign_id')
    .maybeSingle()

  // #9 super review: FK violation em campaign_id (23503) acontece quando a
  // mesa foi deletada mas o client ainda tem o UUID em memória. Retry com
  // campaign_id = null pra não deixar o user com "Sem salvar" preso.
  if (error?.code === '23503' && campaignIdForSave) {
    logDev('upsert: FK violation em campaign_id, retry com null', { campaignId: campaignIdForSave })
    const retryRow = { ...baseRow, campaign_id: null }
    const retry = await supabase
      .from(TABLE)
      .upsert(retryRow)
      .select('short_id, campaign_id')
      .maybeSingle()
    data = retry.data
    error = retry.error
  }

  if (error) {
    logDev('upsert falhou', error)
    let reason = 'unknown'
    if (error.message?.includes('character_limit_reached')) reason = 'limit'
    // check constraint characters_data_size (< 200KB) → reason amigável em vez
    // de "Sem salvar" opaco. 23514 = check_violation.
    else if (error.code === '23514' || error.message?.includes('characters_data_size')) reason = 'too-large'
    return { ok: false, reason }
  }
  return { ok: true, shortId: data?.short_id ?? null, campaignId: data?.campaign_id ?? null }
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

  // Importa SEMPRE primeiro. Em modo replace, só depois de todas as fichas
  // novas estarem salvas é que apagamos o resíduo — assim uma falha no meio
  // não deixa o usuário sem as fichas antigas E sem as novas.
  let imported = 0
  const importedIds = new Set()
  for (const c of valid) {
    const r = await upsertCharacter(c)
    if (!r.ok) return { ok: false, reason: r.reason ?? 'save-failed', imported, invalid, total: list.length }
    imported += 1
    if (c.id) importedIds.add(c.id)
  }

  if (mode === 'replace') {
    // Apaga só as MINHAS fichas que não vieram no import. Filtrar por owner_id
    // é essencial: loadCharacters() no escopo default inclui fichas de jogadores
    // visíveis a um DM, cujo delete falha por RLS (delete é owner-only) e
    // abortaria o processo. Falha de delete do resíduo é tolerada (não-fatal):
    // pior caso fica uma ficha órfã, não perda de dados.
    const { data: { user } } = await supabase.auth.getUser()
    const currentOwnerId = user?.id ?? null
    const current = await loadCharacters()
    for (const c of current) {
      if (currentOwnerId && c.ownerId && c.ownerId !== currentOwnerId) continue
      if (c.id && importedIds.has(c.id)) continue
      await deleteCharacter(c.id)
    }
  }

  return { ok: true, imported, invalid, total: list.length }
}
