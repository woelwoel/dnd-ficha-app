/**
 * Reporta um erro do client pra `/api/log`. Em dev só joga no console;
 * em prod manda fire-and-forget (não bloqueia o fluxo nem espera resposta).
 *
 * Observabilidade mínima — substitui por Sentry quando virar dor.
 */
const IS_DEV = typeof import.meta !== 'undefined' && import.meta.env?.DEV

export function reportError(label, error, context = null) {
  const message = error?.message ?? (typeof error === 'string' ? error : String(error))
  if (IS_DEV) {
    console.warn('[report]', label, error, context)
    return
  }
  try {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, message, context }),
      keepalive: true,
    }).catch(() => { /* fire-and-forget */ })
  } catch { /* silencioso */ }
}
