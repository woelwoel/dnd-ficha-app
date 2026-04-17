/**
 * Tenta carregar um JSON localizado (pt-BR); em falha, faz fallback para o
 * dataset SRD em inglês. Ambos os caminhos são relativos a /srd-data/.
 */
export function fetchSrd(ptFile, fallbackFile) {
  return fetch(`/srd-data/${ptFile}`)
    .then(r => r.json())
    .catch(() => fallbackFile
      ? fetch(`/srd-data/${fallbackFile}`).then(r => r.json())
      : Promise.reject()
    )
}
