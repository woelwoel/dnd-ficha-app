// Script de validação RLS — roda contra o Supabase real.
// Uso: npm run test:rls
// Requer .env.local com VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY,
// TEST_DM_EMAIL, TEST_DM_PASSWORD, TEST_PLAYER_EMAIL, TEST_PLAYER_PASSWORD.
//
// IMPORTANTE: cria/deleta dados reais. Não rode em produção sem revisar.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Carrega .env.local na mão (sem dotenv pra não adicionar dep).
function loadEnv() {
  try {
    const txt = readFileSync('.env.local', 'utf8')
    for (const line of txt.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (m) process.env[m[1]] = m[2]
    }
  } catch { /* sem .env.local — OK se rodando em CI com env já setado */ }
}
loadEnv()

const URL  = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
if (!URL || !ANON) {
  console.error('Faltando VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

function newClient() {
  return createClient(URL, ANON, { auth: { persistSession: false } })
}

async function signIn(email, password) {
  const c = newClient()
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signIn ${email}: ${error.message}`)
  return c
}

const pass = (msg) => console.log(`  ✓ ${msg}`)
const fail = (msg) => { console.error(`  ✗ ${msg}`); process.exitCode = 1 }
function assert(cond, msg) { cond ? pass(msg) : fail(msg) }

async function cleanup(dmClient, campaignId) {
  if (!campaignId) return
  const { error } = await dmClient.from('campaigns').delete().eq('id', campaignId)
  if (error) console.warn(`cleanup: ${error.message}`)
}

async function main() {
  console.log('▶ Login DM + Player')
  const dm     = await signIn(process.env.TEST_DM_EMAIL,     process.env.TEST_DM_PASSWORD)
  const player = await signIn(process.env.TEST_PLAYER_EMAIL, process.env.TEST_PLAYER_PASSWORD)

  const { data: { user: playerUser } } = await player.auth.getUser()
  const playerId = playerUser?.id

  let campaignId = null      // mesa que o player ENTRA
  let otherCampaignId = null // mesa que o player NUNCA entra (teste #1)
  let inviteCode = null
  let charId = null          // ficha do player (testes #1/#2)
  let sysCampaignId = null   // mesa dnd5e do teste #4
  let ddChar = null          // ficha dnd5e do teste #4
  let dhChar = null          // ficha daggerheart do teste #4

  try {
    console.log('\n▶ DM cria mesa')
    {
      const { data, error } = await dm.rpc('create_campaign', { p_name: 'Mesa de Teste' })
      assert(!error && typeof data === 'string', `create_campaign retornou uuid (err=${error?.message})`)
      campaignId = data
    }

    console.log('\n▶ DM lê a própria mesa')
    {
      const { data, error } = await dm.from('campaigns').select('id, invite_code').eq('id', campaignId).maybeSingle()
      assert(!error && data?.id === campaignId, 'DM enxerga a mesa')
      inviteCode = data?.invite_code
      assert(typeof inviteCode === 'string' && inviteCode.length === 10, `invite_code tem 10 chars (got "${inviteCode}")`)
    }

    console.log('\n▶ Player NÃO enxerga a mesa antes de entrar')
    {
      const { data } = await player.from('campaigns').select('id').eq('id', campaignId)
      assert(Array.isArray(data) && data.length === 0, 'Player não-membro recebe lista vazia (RLS)')
    }

    console.log('\n▶ Player tenta código inválido → mensagem genérica')
    {
      const { error } = await player.rpc('join_campaign', { p_code: 'XXXXXXXXXX' })
      assert(!!error && /not_found_or_already_member/.test(error.message), `erro genérico (got "${error?.message}")`)
    }

    console.log('\n▶ Player entra com código válido')
    {
      const { data, error } = await player.rpc('join_campaign', { p_code: inviteCode })
      assert(!error && data === campaignId, `join_campaign devolve cid (err=${error?.message})`)
    }

    console.log('\n▶ Player tenta entrar de novo → mesma mensagem genérica')
    {
      const { error } = await player.rpc('join_campaign', { p_code: inviteCode })
      assert(!!error && /not_found_or_already_member/.test(error.message), 'já-membro mascarado')
    }

    console.log('\n▶ Player agora ENXERGA a mesa')
    {
      const { data } = await player.from('campaigns').select('id').eq('id', campaignId).maybeSingle()
      assert(data?.id === campaignId, 'Player vê a mesa após entrar')
    }

    console.log('\n▶ Player tenta INSERT direto em campaign_members → bloqueado')
    {
      const { error } = await player.from('campaign_members').insert({
        campaign_id: campaignId, user_id: '00000000-0000-0000-0000-000000000000', role: 'player',
      })
      assert(!!error, `insert direto bloqueado (err=${error?.message})`)
    }

    console.log('\n▶ DM rotaciona código')
    {
      const { data, error } = await dm.rpc('rotate_invite_code', { p_campaign_id: campaignId })
      assert(!error && typeof data === 'string' && data !== inviteCode, `código novo (got "${data}", err=${error?.message})`)
    }

    console.log('\n▶ Player NÃO consegue rotacionar')
    {
      const { error } = await player.rpc('rotate_invite_code', { p_campaign_id: campaignId })
      assert(!!error && /not_dm_of_campaign/.test(error.message), 'player bloqueado em rotate')
    }

    console.log('\n▶ [#1] Não-membro NÃO consegue vincular ficha a mesa alheia')
    {
      // DM cria uma 2ª mesa que o player NUNCA entra.
      const { data: oc } = await dm.rpc('create_campaign', { p_name: 'Mesa Alheia' })
      otherCampaignId = oc
      // Player cria uma ficha pessoal.
      charId = crypto.randomUUID()
      const { error: insErr } = await player.from('characters').insert({
        id: charId, data: { info: { name: 'Furtador de Mesa' } },
      })
      assert(!insErr, `player cria ficha pessoal (err=${insErr?.message})`)
      // Tenta setar campaign_id pra mesa onde NÃO é membro → bloqueado pelo
      // WITH CHECK de characters_update_own (migration 0007).
      const { error: updErr } = await player.from('characters')
        .update({ campaign_id: otherCampaignId }).eq('id', charId)
      assert(!!updErr, `update pra mesa não-membro bloqueado (err=${updErr?.message})`)
      // Confirma que a ficha continua pessoal.
      const { data: still } = await player.from('characters')
        .select('campaign_id').eq('id', charId).maybeSingle()
      assert(still?.campaign_id == null, 'ficha permanece sem campaign_id')
    }

    console.log('\n▶ [#2] Sair da mesa desvincula a ficha (DM não lê ex-membro)')
    {
      // Player É membro de campaignId (entrou acima). Vincula a ficha — agora
      // permitido pelo WITH CHECK (é membro).
      const { error: linkErr } = await player.from('characters')
        .update({ campaign_id: campaignId }).eq('id', charId)
      assert(!linkErr, `membro vincula ficha à própria mesa (err=${linkErr?.message})`)
      // DM enxerga a ficha vinculada.
      const { data: dmSees } = await dm.from('characters').select('id').eq('campaign_id', campaignId)
      assert(Array.isArray(dmSees) && dmSees.some(c => c.id === charId), 'DM vê a ficha vinculada')
      // Player sai da mesa (apaga a própria membership).
      const { error: leaveErr } = await player.from('campaign_members')
        .delete().eq('campaign_id', campaignId).eq('user_id', playerId)
      assert(!leaveErr, `player sai da mesa (err=${leaveErr?.message})`)
      // Trigger detach_characters_on_member_removal → campaign_id = null.
      const { data: afterLeave } = await player.from('characters')
        .select('campaign_id').eq('id', charId).maybeSingle()
      assert(afterLeave?.campaign_id == null, 'ficha desvinculada automaticamente ao sair')
      // DM não lê mais a ficha do ex-membro.
      const { data: dmAfter } = await dm.from('characters').select('id').eq('id', charId).maybeSingle()
      assert(!dmAfter, 'DM não lê mais ficha de ex-membro')
    }

    console.log('\n▶ [#3] save_character: lock otimista de versão')
    {
      // Lê a versão atual da ficha do player (charId, criada no bloco #1).
      const { data: row, error: selErr } = await player.from('characters')
        .select('version, data').eq('id', charId).maybeSingle()
      assert(!selErr && Number.isInteger(row?.version),
        `ficha expõe version (got ${row?.version}, err=${selErr?.message}) — migration 0009 aplicada?`)

      // Save com a versão correta → aplica e devolve a versão bumpada.
      const newData = { ...row.data, info: { ...(row.data.info ?? {}), name: 'Renomeado Dev A' } }
      const { data: vNew, error: okErr } = await player.rpc('save_character', {
        p_id: charId, p_data: newData, p_expected_version: row.version,
      })
      assert(!okErr && vNew === row.version + 1,
        `save com versão correta bumpa (got ${vNew}, err=${okErr?.message})`)

      // Save com a versão VELHA (simula o outro dispositivo atrasado) → conflito.
      const { error: confErr } = await player.rpc('save_character', {
        p_id: charId, p_data: { ...newData, conflictMarker: true }, p_expected_version: row.version,
      })
      assert(!!confErr && /version_conflict/.test(confErr.message),
        `versão velha detecta conflito (got "${confErr?.message}")`)

      // A edição vencedora sobreviveu intacta (sem last-write-wins).
      const { data: after } = await player.from('characters')
        .select('data, version').eq('id', charId).maybeSingle()
      assert(after?.data?.info?.name === 'Renomeado Dev A' && !after?.data?.conflictMarker,
        'edição vencedora preservada; perdedora descartada')

      // DM não salva ficha alheia nem com a versão certa (owner check no RPC).
      const { error: dmErr } = await dm.rpc('save_character', {
        p_id: charId, p_data: newData, p_expected_version: vNew,
      })
      assert(!!dmErr, `DM bloqueado em save de ficha alheia (err=${dmErr?.message})`)
    }

    console.log('\n▶ [#4] system: coluna gerada (0012) + trigger mismatch (0013)')
    {
      // Mesa dnd5e via create_campaign com p_system.
      const { data: sysCid, error: ccErr } = await dm.rpc('create_campaign', { p_name: 'Mesa System Test', p_system: 'dnd5e' })
      assert(!ccErr && !!sysCid, `create_campaign aceita p_system (err=${ccErr?.message})`)
      sysCampaignId = sysCid

      // Mesa reflete system='dnd5e'.
      const { data: campRow } = await dm.from('campaigns').select('system').eq('id', sysCid).maybeSingle()
      assert(campRow?.system === 'dnd5e', `campaigns.system = dnd5e (got ${campRow?.system})`)

      // Ficha legada (data SEM system) → coluna gerada deriva 'dnd5e' (backfill).
      ddChar = crypto.randomUUID()
      await dm.from('characters').insert({ id: ddChar, data: { info: { name: 'Legada' } } })
      const { data: ddRow } = await dm.from('characters').select('system').eq('id', ddChar).maybeSingle()
      assert(ddRow?.system === 'dnd5e', `ficha legada deriva system=dnd5e (got ${ddRow?.system})`)

      // Ficha com data.system='daggerheart' → coluna gerada reflete o blob.
      dhChar = crypto.randomUUID()
      await dm.from('characters').insert({ id: dhChar, data: { system: 'daggerheart', info: { name: 'DH' } } })
      const { data: dhRow } = await dm.from('characters').select('system').eq('id', dhChar).maybeSingle()
      assert(dhRow?.system === 'daggerheart', `coluna reflete data.system (got ${dhRow?.system})`)

      // Ligar ficha dnd5e à mesa dnd5e → OK (regressão: vínculo normal não regrediu).
      const { error: okLink } = await dm.from('characters').update({ campaign_id: sysCid }).eq('id', ddChar)
      assert(!okLink, `ficha dnd5e liga a mesa dnd5e (err=${okLink?.message})`)

      // Ligar ficha daggerheart à mesa dnd5e → trigger bloqueia com system_mismatch.
      const { error: mismatchErr } = await dm.from('characters').update({ campaign_id: sysCid }).eq('id', dhChar)
      assert(!!mismatchErr && /system_mismatch/.test(mismatchErr.message),
        `trigger bloqueia ficha de outro sistema (got "${mismatchErr?.message}")`)
    }

    console.log('\n▶ [#5] Mesa de Combate: perímetro das RPCs do Mestre (0015)')
    {
      // O bloco #2 tirou o player da mesa de propósito e o trigger
      // detach_characters_on_member_removal desvinculou a ficha. As RPCs do
      // Mestre só fazem sentido no estado real: player MEMBRO e ficha
      // VINCULADA. Este bloco restaura isso em vez de herdar estado do #2.
      const { data: camp } = await dm.from('campaigns')
        .select('invite_code').eq('id', campaignId).maybeSingle()
      const { error: rejoinErr } = await player.rpc('join_campaign', { p_code: camp?.invite_code })
      assert(!rejoinErr, `player volta pra mesa (err=${rejoinErr?.message})`)
      const { error: relinkErr } = await player.from('characters')
        .update({ campaign_id: campaignId }).eq('id', charId)
      assert(!relinkErr, `ficha revinculada à mesa (err=${relinkErr?.message})`)

      const { data: row } = await dm.from('characters')
        .select('data, version').eq('id', charId).maybeSingle()
      const v = row?.version

      // 5.1 DM aplica patch estreito na ficha do player → OK.
      const { data: v1, error: e1 } = await dm.rpc('dm_apply_combat_state', {
        p_character_id: charId,
        p_patch: { currentHp: 3, conditions: ['prone'] },
        p_expected_version: v,
      })
      assert(!e1 && Number.isInteger(v1), `DM aplica patch de combate (err=${e1?.message})`)

      // 5.2 o patch entrou e NÃO apagou o resto de data.combat.
      const { data: after } = await dm.from('characters')
        .select('data, version').eq('id', charId).maybeSingle()
      assert(after?.data?.combat?.currentHp === 3, `currentHp gravado (got ${after?.data?.combat?.currentHp})`)
      assert(Array.isArray(after?.data?.combat?.conditions) && after.data.combat.conditions[0] === 'prone',
        'conditions gravado')
      assert(after?.data?.info?.name === row?.data?.info?.name, 'resto da ficha preservado (merge, não replace)')

      // 5.3 chave fora da lista → recusa.
      const { error: e2 } = await dm.rpc('dm_apply_combat_state', {
        p_character_id: charId,
        p_patch: { maxHp: 999 },
        p_expected_version: after?.version,
      })
      assert(!!e2 && /illegal_patch_key/.test(e2.message), `chave ilegal recusada (got "${e2?.message}")`)

      // 5.4 versão errada → conflito, sem escrever.
      const { error: e3 } = await dm.rpc('dm_apply_combat_state', {
        p_character_id: charId,
        p_patch: { currentHp: 1 },
        p_expected_version: 999999,
      })
      assert(!!e3 && /version_conflict/.test(e3.message), `versão divergente recusada (got "${e3?.message}")`)

      // 5.5 o próprio player NÃO é DM da mesa → recusa (a RPC é do Mestre).
      const { error: e4 } = await player.rpc('dm_apply_combat_state', {
        p_character_id: charId,
        p_patch: { currentHp: 7 },
        p_expected_version: after?.version,
      })
      assert(!!e4 && /not_dm_of_campaign/.test(e4.message), `player bloqueado na RPC do DM (got "${e4?.message}")`)

      // 5.6 doc completo pelo DM (caminho do descanso) → OK.
      assert(!!after?.data, 'DM relê a ficha após o patch')
      const restored = {
        ...(after?.data ?? {}),
        combat: { ...(after?.data?.combat ?? {}), currentHp: after?.data?.combat?.maxHp ?? 10, conditions: [] },
      }
      const { error: e5 } = await dm.rpc('dm_save_character', {
        p_character_id: charId, p_data: restored, p_expected_version: after?.version,
      })
      assert(!e5, `DM salva doc completo da ficha da mesa (err=${e5?.message})`)

      // 5.7 encounters: DM cria e lê; player não vê nada.
      const { data: enc, error: e6 } = await dm.from('encounters')
        .insert({ campaign_id: campaignId, state: { round: 1, combatants: [] } })
        .select('id, version').single()
      assert(!e6 && !!enc?.id, `DM cria encontro (err=${e6?.message})`)

      const { data: pRows } = await player.from('encounters').select('id').eq('campaign_id', campaignId)
      assert((pRows ?? []).length === 0, `player não enxerga encontro da mesa (got ${(pRows ?? []).length})`)

      const { error: e7 } = await player.from('encounters')
        .insert({ campaign_id: campaignId, state: {} })
      assert(!!e7, `player bloqueado ao criar encontro (err=${e7?.message})`)

      // 5.8 lock otimista do encontro: update com version antiga não pega linha.
      // Só roda se o insert acima deu certo — `enc` cru aqui derrubaria o
      // processo com TypeError e pularia o teste de rate limit.
      if (enc?.id) {
        await dm.from('encounters').update({ state: { round: 2 } }).eq('id', enc.id)
        const { data: stale } = await dm.from('encounters')
          .update({ state: { round: 3 } }).eq('id', enc.id).eq('version', enc.version).select('version')
        assert((stale ?? []).length === 0, 'update com version velha não afeta linha (lock otimista)')

        await dm.from('encounters').delete().eq('id', enc.id)
      }
    }

    console.log('\n▶ Rate limit: 11 tentativas em sequência → última falha com rate_limited')
    {
      let last = null
      for (let i = 0; i < 11; i++) {
        const { error } = await player.rpc('join_campaign', { p_code: 'NEVERMATCH' })
        last = error
      }
      assert(!!last && /rate_limited/.test(last.message), `rate limit dispara (got "${last?.message}")`)
    }
  } finally {
    console.log('\n▶ Cleanup: DM apaga as mesas + player apaga a ficha de teste')
    await cleanup(dm, campaignId)
    await cleanup(dm, otherCampaignId)
    await cleanup(dm, sysCampaignId)
    if (charId) {
      const { error } = await player.from('characters').delete().eq('id', charId)
      if (error) console.warn(`cleanup char: ${error.message}`)
    }
    for (const id of [ddChar, dhChar]) {
      if (!id) continue
      const { error } = await dm.from('characters').delete().eq('id', id)
      if (error) console.warn(`cleanup char #4: ${error.message}`)
    }
  }

  console.log(process.exitCode ? '\n✗ FALHOU' : '\n✓ Tudo verde')
}

main().catch(err => { console.error(err); process.exit(1) })
