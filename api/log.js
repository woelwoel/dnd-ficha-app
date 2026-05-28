// Coletor mínimo de erros do client. Sem dependências, sem armazenamento —
// só joga no console do runtime Vercel, que aparece em Project → Logs.
//
// Suficiente como observabilidade inicial enquanto não houver Sentry/Vercel
// Analytics. Quando aparecer volume, trocar por integração de verdade.

const MAX_PAYLOAD = 4 * 1024 // 4 KiB — evita abuso

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
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
