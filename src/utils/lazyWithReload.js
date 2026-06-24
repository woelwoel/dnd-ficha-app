import { lazy } from 'react'

// Após um deploy, uma aba antiga ainda em memória pode pedir um chunk lazy
// cujo hash sumiu do servidor (e do precache do SW) → ChunkLoadError. Sem
// tratamento, o ErrorBoundary derruba o app inteiro. lazyWithReload recarrega
// a página UMA vez (flag em sessionStorage evita loop) pra puxar o bundle novo.
// (#18 da super review)
export function lazyWithReload(factory) {
  return lazy(() =>
    factory()
      .then(mod => {
        sessionStorage.removeItem('chunkReloaded')
        return mod
      })
      .catch(err => {
        const msg = err?.message ?? ''
        const isChunkError = /Loading chunk|dynamically imported module|Failed to fetch|importing a module script failed/i.test(msg)
        if (isChunkError && !sessionStorage.getItem('chunkReloaded')) {
          sessionStorage.setItem('chunkReloaded', '1')
          window.location.reload()
          return new Promise(() => {}) // nunca resolve — aguarda o reload
        }
        throw err
      })
  )
}
