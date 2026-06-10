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
    if (charId) {
      const { error } = await player.from('characters').delete().eq('id', charId)
      if (error) console.warn(`cleanup char: ${error.message}`)
    }
  }

  console.log(process.exitCode ? '\n✗ FALHOU' : '\n✓ Tudo verde')
}

main().catch(err => { console.error(err); process.exit(1) })
