// Vercel serverless function: apaga DEFINITIVAMENTE a conta do usuário
// corrente em auth.users via admin API do Supabase.
//
// O delete em auth.users CASCATA pra public.profiles (e por consequência
// characters, campaign_members, etc) graças à FK `on delete cascade` em
// profiles.id. Não precisamos chamar delete_my_account separadamente.
//
// Por que serverless e não chamar do client? A admin API exige a
// service_role key, que nunca pode ir pro browser.
//
// Env vars necessárias (configurar no Vercel):
//   SUPABASE_URL                — pública, mesma do client
//   SUPABASE_SERVICE_ROLE_KEY   — secreta (nunca expor)
//
// Contrato:
//   POST /api/delete-account
//   Header:  Authorization: Bearer <jwt do user>
//   Body:    { "confirm": "APAGAR" }
//   Resposta: 200 { ok: true } | 4xx { error: '...' } | 5xx { error: '...' }

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return res.status(500).json({ error: 'server_misconfigured' })
  }

  // Token do user — exigido para identificar quem está pedindo a exclusão.
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'missing_token' })
  }
  const token = auth.slice('Bearer '.length).trim()
  if (!token) {
    return res.status(401).json({ error: 'missing_token' })
  }

  // Body: confirmação explícita pra evitar requests acidentais.
  const body = typeof req.body === 'object' && req.body !== null
    ? req.body
    : (() => { try { return JSON.parse(req.body || '{}') } catch { return {} } })()
  if (body?.confirm !== 'APAGAR') {
    return res.status(400).json({ error: 'confirm_required' })
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Valida o token e descobre quem é o user.
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'invalid_token' })
  }
  const uid = userData.user.id

  // Apaga em auth.users; FK cascade limpa tudo no public schema.
  const { error: delErr } = await admin.auth.admin.deleteUser(uid)
  if (delErr) {
    return res.status(500).json({ error: 'delete_failed', message: delErr.message })
  }

  return res.status(200).json({ ok: true })
}
