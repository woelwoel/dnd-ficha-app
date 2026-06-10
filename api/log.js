// Coletor mínimo de erros do client. Sem dependências, sem armazenamento —
// só joga no console do runtime Vercel, que aparece em Project → Logs.
//
// Suficiente como observabilidade inicial enquanto não houver Sentry/Vercel
// Analytics. Quando aparecer volume, trocar por integração de verdade.

const MAX_PAYLOAD = 4 * 1024 // 4 KiB — evita abuso

// Rate limit por IP, in-memory. Não é distribuído (cada instância tem seu
// Map), mas com Fluid Compute as instâncias são reusadas, então corta a maior
// parte de um flood vindo de um único IP. Para garantia forte, complementar
// com regra de rate limit no Vercel WAF.
const RL_WINDOW_MS = 60_000
const RL_MAX = 60 // 60 logs/min/IP
const hits = new Map() // ip -> number[] (timestamps dentro da janela)

function isRateLimited(ip) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < RL_WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  // Limpeza preguiçosa pra não vazar memória se muitos IPs aparecerem.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every(t => now - t >= RL_WINDOW_MS)) hits.delete(k)
    }
  }
  return recent.length > RL_MAX
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const fwd = req.headers['x-forwarded-for']
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim()
    || req.socket?.remoteAddress
    || 'unknown'
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'rate_limited' })
  }

  const raw = typeof req.body === 'string'
    ? req.body
    : JSON.stringify(req.body ?? {})

  if (raw.length > MAX_PAYLOAD) {
    return res.status(413).json({ error: 'payload_too_large' })
  }

  let body
  try { body = typeof req.body === 'object' ? req.body : JSON.parse(raw) }
  catch { return res.status(400).json({ error: 'invalid_json' }) }

  // Saída em uma linha pra ficar grepável em Vercel Logs.
  const payload = {
    label: String(body?.label ?? 'unknown').slice(0, 120),
    message: String(body?.message ?? '').slice(0, 500),
    context: body?.context ?? null,
    ts: new Date().toISOString(),
    ua: req.headers['user-agent']?.slice(0, 200) ?? null,
  }
  console.error('[client-log]', JSON.stringify(payload))

  return res.status(204).end()
}
