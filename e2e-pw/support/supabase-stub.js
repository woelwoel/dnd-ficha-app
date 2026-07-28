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
 * @param {{ characters?: any[], campaigns?: any[], onUpsert?: (row:any)=>void, failUpsert?: number }} opts
 */
export async function stubSupabase(context, opts = {}) {
  const store = new Map() // id → row { data, short_id, campaign_id, owner_id, ... }
  let shortSeq = 1
  // Mesa de Combate: mesas, encontros e as RPCs do Mestre (migration 0015).
  const campaigns = opts.campaigns ?? []       // [{ id, name, dm_id, system }]
  const encounters = new Map()                 // id → row
  let encSeq = 1
  const templates = new Map()                  // id → row
  let tplSeq = 1
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

    if (path.startsWith('campaigns')) {
      if (method === 'GET') return json(route, wantsSingle ? (campaigns[0] ?? null) : campaigns)
      return json(route, wantsSingle ? {} : [])
    }

    if (path.startsWith('encounter_templates')) {
      if (method === 'GET') return json(route, [...templates.values()])
      if (method === 'POST') {
        let body = {}
        try { body = JSON.parse(req.postData() || '{}') } catch { /* noop */ }
        const incoming = Array.isArray(body) ? body[0] : body
        const dup = [...templates.values()].some(
          t => t.name.trim().toLowerCase() === String(incoming.name).trim().toLowerCase())
        if (dup) return json(route, { code: '23505', message: 'duplicate key' }, 409)
        const row = { id: `tpl-${tplSeq++}`, ...incoming }
        templates.set(row.id, row)
        return json(route, wantsSingle ? row : [row], 201)
      }
      if (method === 'PATCH') {
        let body = {}
        try { body = JSON.parse(req.postData() || '{}') } catch { /* noop */ }
        const id = url.searchParams.get('id')?.replace('eq.', '')
        const row = templates.get(id)
        if (row) Object.assign(row, body)
        return json(route, wantsSingle ? (row ?? null) : (row ? [row] : []))
      }
      if (method === 'DELETE') {
        const id = url.searchParams.get('id')?.replace('eq.', '')
        templates.delete(id)
        return json(route, wantsSingle ? null : [])
      }
    }

    if (path.startsWith('encounters')) {
      if (method === 'GET') {
        const rows = [...encounters.values()].filter(r => r.active)
        return json(route, wantsSingle ? (rows[0] ?? null) : rows)
      }
      if (method === 'POST') {
        let body = {}
        try { body = JSON.parse(req.postData() || '{}') } catch { /* noop */ }
        const incoming = Array.isArray(body) ? body[0] : body
        const row = { id: `enc-${encSeq++}`, campaign_id: incoming.campaign_id, state: incoming.state, version: 1, active: true }
        encounters.set(row.id, row)
        return json(route, wantsSingle ? row : [row], 201)
      }
      if (method === 'PATCH') {
        let body = {}
        try { body = JSON.parse(req.postData() || '{}') } catch { /* noop */ }
        const id = url.searchParams.get('id')?.replace('eq.', '')
        const row = encounters.get(id)
        if (!row) return json(route, wantsSingle ? null : [])
        Object.assign(row, body, { version: row.version + 1 })
        const repr = { version: row.version }
        return json(route, wantsSingle ? repr : [repr])
      }
    }

    if (path.startsWith('rpc/dm_apply_combat_state')) {
      let body = {}
      try { body = JSON.parse(req.postData() || '{}') } catch { /* noop */ }
      const row = store.get(body.p_character_id)
      if (!row) return json(route, { message: 'not_dm_of_campaign' }, 400)
      row.data = { ...row.data, combat: { ...row.data.combat, ...body.p_patch } }
      row.version += 1
      return json(route, row.version)
    }

    if (path.startsWith('rpc/dm_save_character')) {
      let body = {}
      try { body = JSON.parse(req.postData() || '{}') } catch { /* noop */ }
      const row = store.get(body.p_character_id)
      if (!row) return json(route, { message: 'not_dm_of_campaign' }, 400)
      row.data = body.p_data
      row.version += 1
      return json(route, row.version)
    }

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
