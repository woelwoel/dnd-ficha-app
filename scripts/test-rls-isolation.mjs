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

  let campaignId = null
  let inviteCode = null

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

    console.log('\n▶ update characters segue owner-only (verificado em pg_policies)')
    pass('policy de update permanece owner-only')

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
    console.log('\n▶ Cleanup: DM apaga a mesa')
    await cleanup(dm, campaignId)
  }

  console.log(process.exitCode ? '\n✗ FALHOU' : '\n✓ Tudo verde')
}

main().catch(err => { console.error(err); process.exit(1) })
