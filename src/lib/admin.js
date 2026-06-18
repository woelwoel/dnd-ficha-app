import { supabase } from './supabase'

function logDev(label, payload) {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[admin] ${label}:`, payload)
  }
}

/** Todas as fichas (qualquer dono). Só retorna tudo pra admin — RLS garante. */
export async function adminListCharacters() {
  const { data, error } = await supabase
    .from('characters')
    .select('id, owner_id, campaign_id, short_id, data, updated_at, profiles:owner_id(display_name)')
    .order('updated_at', { ascending: false })
  if (error) { logDev('adminListCharacters', error); return [] }
  return (data ?? []).map(row => ({
    id: row.id,
    shortId: row.short_id ?? null,
    ownerId: row.owner_id,
    ownerName: row.profiles?.display_name ?? '—',
    campaignId: row.campaign_id ?? null,
    name: row.data?.info?.name ?? 'Sem nome',
    className: row.data?.info?.class ?? '',
    level: row.data?.info?.level ?? 1,
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : null,
  }))
}

/** Todas as mesas com DM e contagem de membros. */
export async function adminListCampaigns() {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, dm_id, created_at, profiles:dm_id(display_name), campaign_members(count)')
    .order('created_at', { ascending: true })
  if (error) { logDev('adminListCampaigns', error); return [] }
  return (data ?? []).map(c => ({
    id: c.id,
    name: c.name,
    dmId: c.dm_id,
    dmName: c.profiles?.display_name ?? '—',
    memberCount: c.campaign_members?.[0]?.count ?? 0,
    createdAt: c.created_at ? Date.parse(c.created_at) : null,
  }))
}
