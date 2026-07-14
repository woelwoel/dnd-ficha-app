import { describe, it, expect, beforeEach, vi } from 'vitest'
import { installChunkReloadHandler } from '../utils/chunkReload'

/**
 * Deploy novo invalida chunks lazy de sessões abertas (SW skipWaiting +
 * cleanupOutdatedCaches apagam o precache antigo; o hash não existe mais no
 * servidor). O Vite dispara `vite:preloadError` nesse caso — recarregamos a
 * página UMA vez pra sessão renascer no bundle novo (era o que "sumia" os
 * dados 3D: import 404 marcava failed pela sessão inteira).
 */
describe('installChunkReloadHandler', () => {
  let reload
  let uninstall

  beforeEach(() => {
    sessionStorage.clear()
    reload = vi.fn()
    uninstall?.()
    uninstall = installChunkReloadHandler({ reload })
  })

  function firePreloadError() {
    const ev = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(ev)
    return ev
  }

  it('recarrega a página no primeiro vite:preloadError e suprime o erro', () => {
    const ev = firePreloadError()
    expect(reload).toHaveBeenCalledTimes(1)
    expect(ev.defaultPrevented).toBe(true)
  })

  it('não recarrega de novo em erro imediato (guarda anti-loop)', () => {
    firePreloadError()
    const second = firePreloadError()
    expect(reload).toHaveBeenCalledTimes(1)
    expect(second.defaultPrevented).toBe(false)
  })

  it('a guarda expira: deploy futuro na mesma aba pode recarregar de novo', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-07-14T12:00:00Z'))
      firePreloadError()
      vi.setSystemTime(new Date('2026-07-14T12:02:00Z')) // > 60s depois
      firePreloadError()
      expect(reload).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
