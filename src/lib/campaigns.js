import { supabase } from './supabase'
import { DEFAULT_SYSTEM } from '../systems/envelope'

const T_CAMPAIGNS = 'campaigns'
const T_MEMBERS   = 'campaign_members'

function logDev(label, payload) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[campaigns] ${label}:`, payload)
  }
}

/**
 * Move uma ficha existente pra uma mesa (ou destaca da mesa atual com null).
 * RLS garante que só o owner consegue update; e o WITH CHECK da policy
 * characters_update_own (migration 0007) exige membership na mesa quando
 * campaign_id != null. Confirmamos com `is_campaign_member` antes só pra
 * mostrar mensagem amigável em vez do erro genérico de RLS.
 *
 * @param {string} characterId UUID da ficha
 * @param {string|null} campaignId UUID da mesa (ou null pra destacar)
 */
export async function moveCharacterToCampaign(characterId, campaignId) {
  if (campaignId) {
    // Confirma membership antes de tentar o UPDATE — se o user já saiu
    // da mesa (ou foi removido) o UPDATE falha por RLS com erro opaco.
    const mine = await listMyCampaigns()
    if (!mine.some(c => c.id === campaignId)) {
      return { ok: false, reason: 'not-a-member' }
    }
  }
  const { error } = await supabase
    .from('characters')
    .update({ campaign_id: campaignId })
    .eq('id', characterId)
  if (error) {
    if (/system_mismatch/.test(error.message)) {
      return { ok: false, reason: 'system-mismatch' }
    }
    logDev('moveCharacterToCampaign', error)
    return { ok: false, reason: 'unknown', message: error.message }
  }
  return { ok: true }
}

/** Lista mesas em que o usuário corrente é membro (com role). */
export async function listMyCampaigns() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  // 1) descobre as memberships (RLS já filtra)
  const { data: members, error: e1 } = await supabase
    .from(T_MEMBERS)
    .select('campaign_id, role')
    .eq('user_id', user.id)
  if (e1) { logDev('listMyCampaigns members', e1); return [] }
  const ids = members.map(m => m.campaign_id)
  if (ids.length === 0) return []
  // 2) busca as campaigns
  const { data: campaigns, error: e2 } = await supabase
    .from(T_CAMPAIGNS)
    .select('id, name, dm_id, invite_code, created_at')
    .order('created_at', { ascending: true })
  if (e2) { logDev('listMyCampaigns campaigns', e2); return [] }
  // 3) merge com role
  const roleById = Object.fromEntries(members.map(m => [m.campaign_id, m.role]))
  return campaigns
    .filter(c => ids.includes(c.id))
    .map(c => ({ ...c, role: roleById[c.id] }))
}

export async function createCampaign(name, system = DEFAULT_SYSTEM) {
  const { data, error } = await supabase.rpc('create_campaign', { p_name: name, p_system: system })
  if (error) {
    if (/too_many_campaigns/.test(error.message)) return { ok: false, reason: 'too-many-campaigns' }
    if (/invalid_name/.test(error.message)) return { ok: false, reason: 'invalid-name' }
    // Migration 0013 (p_system) ainda não aplicada: PostgREST não acha a função
    // com o arg extra (PGRST202) ou o Postgres reporta função inexistente (42883).
    // Degrada pro signature antigo — a mesa nasce sem system até a migration landar.
    if (error.code === 'PGRST202' || error.code === '42883') {
      const retry = await supabase.rpc('create_campaign', { p_name: name })
      if (retry.error) { logDev('createCampaign retry', retry.error); return { ok: false, reason: 'unknown' } }
      return { ok: true, id: retry.data }
    }
    logDev('createCampaign', error)
    return { ok: false, reason: 'unknown' }
  }
  return { ok: true, id: data }
}

/** Sistema de uma mesa (pra forçar o sistema na criação de ficha dentro dela). */
export async function getCampaignSystem(campaignId) {
  const { data, error } = await supabase
    .from(T_CAMPAIGNS).select('system').eq('id', campaignId).maybeSingle()
  if (error || !data?.system) return DEFAULT_SYSTEM
  return data.system
}

export async function joinCampaign(code) {
  const { data, error } = await supabase.rpc('join_campaign', { p_code: code })
  if (error) {
    if (/rate_limited/.test(error.message)) return { ok: false, reason: 'rate-limited' }
    if (/not_found_or_already_member/.test(error.message)) return { ok: false, reason: 'not-found-or-already-member' }
    logDev('joinCampaign', error)
    return { ok: false, reason: 'unknown' }
  }
  return { ok: true, id: data }
}

export async function rotateInviteCode(campaignId) {
  const { data, error } = await supabase.rpc('rotate_invite_code', { p_campaign_id: campaignId })
  if (error) { logDev('rotateInviteCode', error); return { ok: false, reason: 'unknown' } }
  return { ok: true, code: data }
}

export async function listMembers(campaignId) {
  // Join via foreign key relationship com profiles pra puxar display_name
  // e avatar (#14 super review). RLS de profiles (após #3) permite ler
  // perfis de quem compartilha mesa — então DM vê todos os players.
  const { data, error } = await supabase
    .from(T_MEMBERS)
    .select('user_id, role, created_at, profiles:user_id(display_name, avatar_url)')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })
  if (error) { logDev('listMembers', error); return [] }
  return data ?? []
}

export async function removeMember(campaignId, userId) {
  const { error } = await supabase
    .from(T_MEMBERS)
    .delete()
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
  if (error) { logDev('removeMember', error); return { ok: false, reason: 'unknown' } }
  return { ok: true }
}

export async function leaveCampaign(campaignId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'not-authenticated' }
  return removeMember(campaignId, user.id)
}

/**
 * Resumo das fichas da mesa (RPC campaign_roster, migration 0011), visível a
 * QUALQUER membro — devolve só campos seguros (sem o `data` completo). Usado
 * no mapa/Companhia pra todos verem a companhia sem conseguir abrir a ficha
 * alheia. Molda cada linha no formato que token/sidebar/tooltip esperam.
 *
 * Retorna { ok } pra o chamador cair no fallback (loadCharacters) quando a
 * migration 0011 ainda não foi aplicada (RPC inexistente → erro).
 */
export async function loadCampaignRoster(campaignId) {
  const { data, error } = await supabase.rpc('campaign_roster', { p_campaign_id: campaignId })
  if (error) { logDev('loadCampaignRoster', error); return { ok: false, rows: [] } }
  const rows = (data ?? []).map(r => ({
    id: r.id,
    shortId: r.short_id ?? null,
    ownerId: r.owner_id ?? null,
    campaignId: r.campaign_id ?? null,
    playerName: r.player_name ?? null,
    revealed: r.revealed ?? true,
    isSummary: true,
    info: {
      name: r.name ?? '',
      class: r.class ?? '',
      race: r.race ?? '',
      level: r.level ?? 1,
    },
    combat: {
      maxHp: r.max_hp ?? null,
      currentHp: r.current_hp ?? null,
      armorClass: r.armor_class ?? null,
    },
    position: r.position ?? null,
    lastOpenedAt: r.last_opened_at ? Date.parse(r.last_opened_at) : null,
  }))
  return { ok: true, rows }
}

/** Carrega fichas DA MESA (apenas o DM vê via policy). */
export async function loadCampaignCharacters(campaignId) {
  const { data, error } = await supabase
    .from('characters')
    .select('id, owner_id, data, last_opened_at, short_id, campaign_id')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })
  if (error) { logDev('loadCampaignCharacters', error); return [] }
  return data ?? []
}

/**
 * Apaga a mesa. RLS (`campaigns_delete_dm` em 0004) garante que só o DM
 * consegue. ON DELETE CASCADE remove memberships; fichas têm
 * `on delete set null` em campaign_id (viram pessoais dos donos).
 */
export async function deleteCampaign(campaignId) {
  const { error } = await supabase
    .from(T_CAMPAIGNS)
    .delete()
    .eq('id', campaignId)
  if (error) { logDev('deleteCampaign', error); return { ok: false, reason: 'unknown', message: error.message } }
  return { ok: true }
}

/**
 * Renomeia a mesa. RLS garante que só DM (ou admin via política
 * campaigns_admin_all) consegue. Valida nome 1..80 antes de ir ao servidor.
 */
export async function renameCampaign(campaignId, name) {
  const trimmed = (name ?? '').trim()
  if (trimmed.length < 1 || trimmed.length > 80) {
    return { ok: false, reason: 'invalid-name' }
  }
  const { error } = await supabase
    .from(T_CAMPAIGNS)
    .update({ name: trimmed })
    .eq('id', campaignId)
  if (error) { logDev('renameCampaign', error); return { ok: false, reason: 'unknown' } }
  return { ok: true }
}

export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) { logDev('deleteMyAccount', error); return { ok: false, reason: 'unknown' } }
  return { ok: true }
}

/**
 * Garante (idempotente) que o profile do usuário corrente existe. Recupera o
 * cenário "conta zumbi" (#17): se um delete-account parcial deixou auth.users
 * vivo sem profile, o login recria o profile e destrava os INSERTs de fichas
 * (que falhavam por FK). No-op quando o profile já existe.
 */
export async function ensureMyProfile() {
  const { error } = await supabase.rpc('ensure_my_profile')
  if (error) { logDev('ensureMyProfile', error); return { ok: false, reason: 'unknown' } }
  return { ok: true }
}
