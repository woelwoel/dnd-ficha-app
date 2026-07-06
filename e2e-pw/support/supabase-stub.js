/**
 * Harness de auth/backend para E2E — sem backend real nem secrets.
 *
 * O app virou auth-only Supabase (Gate exige sessão). Aqui:
 *  1. seedSession: grava uma sessão fake no localStorage (sb-dummy-auth-token,
 *     ref "dummy" do build E2E) → supabase.auth.getSession() passa o Gate.
 *  2. stubSupabase: intercepta toda a rede /auth/v1 e /rest/v1 com um store
 *     de personagens em memória → app 100% offline e determinístico.
 *
 * Uso: `await installAuthedApp(context, { characters: [...] })` ANTES do goto.
 */

const PROJECT_REF = 'dummy' // casa com VITE_SUPABASE_URL do playwright.config
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`
const USER_ID = '00000000-0000-4000-8000-000000000001'
const USER = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'e2e@teste.local',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00.000Z',
}

// JWT sintético (não é verificado — getSession só checa expires_at).
const FAKE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMmUifQ.sig'

function fakeSession() {
  const nowS = Math.floor(Date.now() / 1000)
  return {
    access_token: FAKE_JWT,
    refresh_token: 'e2e-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: nowS + 3600, // futuro → getSession não tenta refresh
    user: USER,
  }
}

/** Semeia a sessão antes de qualquer script da página rodar. */
export async function seedSession(context) {
  await context.addInitScript(
    ([key, session]) => {
      window.localStorage.setItem(key, JSON.stringify(session))
      // Dados 3D desligados nos e2e: WebGL headless é flaky e os specs
      // esperam o fluxo clássico (painel abre com o total na hora).
      window.localStorage.setItem('dnd-ficha:dice3d', 'off')
    },
    [STORAGE_KEY, fakeSession()],
  )
}

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  })
}

/**
 * Intercepta auth + rest do Supabase com um store em memória.
 * @param {import('@playwright/test').BrowserContext} context
 * @param {{ characters?: any[], onUpsert?: (row:any)=>void, failUpsert?: number }} opts
 */
export async function stubSupabase(context, opts = {}) {
  const store = new Map() // id → row { data, short_id, campaign_id, owner_id, ... }
  let shortSeq = 1
  for (const ch of opts.characters ?? []) {
    store.set(ch.id, {
      id: ch.id,
      data: ch,
      short_id: ch.shortId ?? `SHORT${shortSeq++}A`,
      owner_id: USER_ID,
      campaign_id: ch.campaignId ?? null,
      created_at: '2026-01-01T00:00:00.000Z',
      last_opened_at: null,
      version: 1,
    })
  }

  // Auth: getUser e refresh.
  await context.route('**/auth/v1/**', route => {
    const url = route.request().url()
    if (url.includes('/user')) return json(route, USER)
    if (url.includes('/token')) return json(route, { ...fakeSession() })
    if (url.includes('/logout')) return json(route, {})
    return json(route, {})
  })

  // REST: characters + rpc + catch-all benigno.
  await context.route('**/rest/v1/**', route => {
    const req = route.request()
    const method = req.method()
    const url = new URL(req.url())
    const path = url.pathname.replace('/rest/v1/', '')
    const wantsSingle = (req.headers()['accept'] || '').includes('pgrst.object')

    // characters
    if (path.startsWith('characters')) {
      if (method === 'GET') {
        const rows = [...store.values()]
        return json(route, wantsSingle ? (rows[0] ?? null) : rows)
      }
      if (method === 'POST' || method === 'PATCH') {
        if (opts.failUpsert) {
          return json(route, { message: 'stub upsert error', code: 'XXStub' }, opts.failUpsert)
        }
        let body = {}
        try { body = JSON.parse(req.postData() || '{}') } catch { /* noop */ }
        const incoming = Array.isArray(body) ? body[0] : body
        const id = incoming.id
        const existing = store.get(id)
        const row = {
          id,
          data: incoming.data ?? incoming,
          short_id: existing?.short_id ?? `NEW${shortSeq++}ABCDE`.slice(0, 10),
          owner_id: USER_ID,
          campaign_id: incoming.campaign_id ?? existing?.campaign_id ?? null,
          created_at: existing?.created_at ?? new Date().toISOString(),
          last_opened_at: incoming.last_opened_at ?? null,
          version: (existing?.version ?? 0) + 1,
        }
        store.set(id, row)
        opts.onUpsert?.(row)
        const repr = { short_id: row.short_id, campaign_id: row.campaign_id }
        return json(route, wantsSingle ? repr : [repr], 201)
      }
      if (method === 'DELETE') return json(route, wantsSingle ? null : [])
    }

    // rpc (save_character, campaign_roster, ensure_profile, etc.) e o resto:
    // defaults benignos pra não travar chamadas não enumeradas.
    if (method === 'GET') return json(route, wantsSingle ? null : [])
    return json(route, wantsSingle ? {} : [])
  })
}

/** Atalho: sessão semeada + backend stub. */
export async function installAuthedApp(context, opts = {}) {
  await seedSession(context)
  await stubSupabase(context, opts)
}

export { USER_ID, STORAGE_KEY }
