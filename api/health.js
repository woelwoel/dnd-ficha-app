// Health check leve. Vai aos poucos: 200 se a função estiver de pé;
// 503 se o ping no Supabase falhar (qualquer dependência crítica).
// Pode ser usado por uptime monitor externo.

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return res.status(503).json({ ok: false, reason: 'env_missing' })
  }

  // Health do PostgREST: GET /rest/v1/ devolve 200 com a descrição da API.
  try {
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 4000)
    const r = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey },
      signal: ctrl.signal,
    })
    clearTimeout(tid)
    if (!r.ok) return res.status(503).json({ ok: false, reason: 'supabase_unavailable', status: r.status })
    return res.status(200).json({ ok: true, ts: new Date().toISOString() })
  } catch (e) {
    return res.status(503).json({ ok: false, reason: 'supabase_unreachable', message: e?.message })
  }
}
