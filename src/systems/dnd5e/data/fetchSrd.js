/**
 * Tenta carregar um JSON localizado (pt-BR); em falha, faz fallback para o
 * dataset SRD em inglês. Ambos os caminhos são relativos a /srd-data/.
 *
 * Prefira consumir dados SRD via `useSrd()` — este utilitário existe só
 * para casos isolados fora do provider (scripts, migrações).
 *
 * Endurecido:
 *  - valida `res.ok` (404/500 não caem como JSON quebrado)
 *  - valida `content-type` de JSON antes do .json()
 *  - respeita AbortController via `signal`
 */
export async function fetchSrd(ptFile, fallbackFile, { signal } = {}) {
  const candidates = [ptFile, fallbackFile].filter(Boolean)
  for (const file of candidates) {
    try {
      const res = await fetch(`/srd-data/${file}`, { signal })
      if (!res.ok) continue
      const ct = res.headers.get('content-type') ?? ''
      if (!ct.toLowerCase().includes('json')) continue
      return await res.json()
    } catch (err) {
      if (err?.name === 'AbortError') throw err
      // tenta o próximo candidato silenciosamente
    }
  }
  return []
}
