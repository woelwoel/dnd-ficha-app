import { supabase } from './supabase'

const T_CAMPAIGNS = 'campaigns'
const T_MEMBERS   = 'campaign_members'

function logDev(label, payload) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[campaigns] ${label}:`, payload)
  }
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

export async function createCampaign(name) {
  const { data, error } = await supabase.rpc('create_campaign', { p_name: name })
  if (error) { logDev('createCampaign', error); return { ok: false, reason: 'unknown' } }
  return { ok: true, id: data }
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
  const { data, error } = await supabase
    .from(T_MEMBERS)
    .select('user_id, role, created_at')
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

export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) { logDev('deleteMyAccount', error); return { ok: false, reason: 'unknown' } }
  return { ok: true }
}
