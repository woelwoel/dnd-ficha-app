import { useEffect, useState } from 'react'

/**
 * Banner sticky no topo quando o navegador detecta que está offline.
 * Usa `navigator.onLine` + eventos `online`/`offline`. Não detecta servidor caído —
 * só conectividade básica do browser.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    function handleOnline() { setOnline(true) }
    function handleOffline() { setOnline(false) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (online) return null

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 text-center text-xs font-semibold py-1.5 px-3 text-white bg-[rgba(180,60,60,0.95)] border-b border-[rgba(120,30,30,0.6)]"
    >
      ⚠ Você está offline. Mudanças não serão salvas até a conexão voltar.
    </div>
  )
}
