/**
 * Cruza membros da mesa com as fichas vinculadas. Puro: sem Supabase e sem
 * React, porque a regra de "quem é dono de quê" merece teste sem rede.
 *
 * Aceita os DOIS formatos de ficha que a mesa produz — a linha crua da tabela
 * (`owner_id`, `data.info`), que só o Mestre lê, e o resumo do RPC
 * `campaign_roster` (`ownerId`, `info`), que é o que o jogador enxerga.
 */

function normalizeCharacter(row) {
  const info = row.data?.info ?? row.info ?? {}
  const combat = row.data?.combat ?? row.combat ?? {}
  return {
    id: row.id,
    ownerId: row.owner_id ?? row.ownerId ?? null,
    openId: row.short_id ?? row.shortId ?? row.id,
    name: info.name || '(sem nome)',
    race: info.race ?? '',
    className: info.class ?? '',
    level: info.level ?? 1,
    currentHp: combat.currentHp ?? null,
    maxHp: combat.maxHp ?? null,
    armorClass: combat.armorClass ?? null,
  }
}

function displayNameOf(member) {
  const nome = member.profiles?.display_name?.trim()
  if (nome) return nome
  return `${String(member.user_id ?? '').slice(0, 8)}…`
}

/**
 * @param {Array} members — saída de `listMembers`
 * @param {Array} characters — saída de `fetchCampaignCharacters().rows` ou de
 *   `loadCampaignRoster().rows`
 * @param {{currentUserId?: string}} [opts]
 * @returns {{rows: Array, orphanCharacters: Array}} — `orphanCharacters` são as
 *   fichas cujo dono não é mais membro da mesa: some-las seria esconder que
 *   elas ainda estão vinculadas.
 */
export function mergeParty(members = [], characters = [], { currentUserId = null } = {}) {
  const fichas = (characters ?? []).map(normalizeCharacter)
  const porDono = new Map()
  for (const f of fichas) {
    if (!f.ownerId) continue
    if (!porDono.has(f.ownerId)) porDono.set(f.ownerId, [])
    porDono.get(f.ownerId).push(f)
  }

  const rows = (members ?? []).map(m => ({
    userId: m.user_id,
    displayName: displayNameOf(m),
    avatarUrl: m.profiles?.avatar_url ?? null,
    role: m.role,
    isSelf: m.user_id === currentUserId,
    characters: porDono.get(m.user_id) ?? [],
  }))

  // Mestre primeiro; o resto na ordem em que a mesa devolveu.
  rows.sort((a, b) => (a.role === 'dm' ? -1 : 0) - (b.role === 'dm' ? -1 : 0))

  const membros = new Set((members ?? []).map(m => m.user_id))
  const orphanCharacters = fichas.filter(f => !f.ownerId || !membros.has(f.ownerId))

  return { rows, orphanCharacters }
}
