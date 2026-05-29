import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Banner inferior pra avisar o usuário quando o service worker baixou uma
 * nova versão do app. O `registerType: 'autoUpdate'` (vite.config.js) já
 * dispara skipWaiting automaticamente; aqui só notificamos visualmente.
 *
 * Também mostra um toast "app pronto para usar offline" no primeiro install.
 */
export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl) {
      if (import.meta.env.DEV) console.log('[PWA] SW registrado:', swUrl)
    },
    onRegisterError(err) {
      console.error('[PWA] falha ao registrar SW:', err)
    },
  })

  const [dismissedOffline, setDismissedOffline] = useState(false)

  // Auto-esconde o toast de "pronto offline" depois de 4s.
  useEffect(() => {
    if (!offlineReady) return
    const t = setTimeout(() => setOfflineReady(false), 4000)
    return () => clearTimeout(t)
  }, [offlineReady, setOfflineReady])

  function handleUpdate() {
    updateServiceWorker(true)
  }

  function handleClose() {
    setNeedRefresh(false)
  }

  if (!needRefresh && (!offlineReady || dismissedOffline)) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)]"
    >
      {needRefresh ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-2 border-shell-border bg-bg-elevated text-ink-primary">
          <span className="text-lg" aria-hidden>📜</span>
          <p className="text-sm flex-1">Nova versão do app disponível.</p>
          <button
            onClick={handleUpdate}
            className="text-xs font-semibold px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-white"
          >
            Atualizar
          </button>
          <button
            onClick={handleClose}
            aria-label="Adiar"
            className="text-lg leading-none opacity-60 hover:opacity-100"
          >×</button>
        </div>
      ) : offlineReady ? (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg shadow border border-shell-border bg-bg-elevated text-ink-primary text-sm">
          <span aria-hidden>✓</span>
          <span>App pronto para uso offline.</span>
          <button
            onClick={() => setDismissedOffline(true)}
            aria-label="Fechar"
            className="ml-auto opacity-60 hover:opacity-100 text-lg leading-none"
          >×</button>
        </div>
      ) : null}
    </div>
  )
}
