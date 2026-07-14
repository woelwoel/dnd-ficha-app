/**
 * Recupera sessões abertas que atravessaram um deploy.
 *
 * Deploy novo muda o hash dos chunks lazy; o SW (autoUpdate + skipWaiting +
 * cleanupOutdatedCaches) assume a aba no meio da sessão e apaga o precache
 * antigo — o próximo dynamic import da sessão velha toma 404. O Vite sinaliza
 * isso com o evento global `vite:preloadError`; recarregar renasce a sessão
 * no bundle novo (sem isso os dados 3D "somem" até um refresh manual: o
 * import 404 marcava dice3d como indisponível pela sessão inteira).
 */
const KEY = 'dnd-ficha:chunk-reload-at'
const MIN_INTERVAL_MS = 60_000 // anti-loop: se o 404 persistir, não fica recarregando

export function installChunkReloadHandler({ reload = () => window.location.reload() } = {}) {
  const onPreloadError = event => {
    let last = 0
    try { last = Number(sessionStorage.getItem(KEY)) || 0 } catch { /* ignore */ }
    if (Date.now() - last < MIN_INTERVAL_MS) return
    try { sessionStorage.setItem(KEY, String(Date.now())) } catch { /* ignore */ }
    event.preventDefault() // suprime o erro do Vite: o reload resolve
    reload()
  }
  window.addEventListener('vite:preloadError', onPreloadError)
  return () => window.removeEventListener('vite:preloadError', onPreloadError)
}
