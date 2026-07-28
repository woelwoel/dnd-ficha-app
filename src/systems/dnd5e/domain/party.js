// src/systems/dnd5e/domain/party.js
/**
 * Nível da companhia — a entrada da conta de dificuldade de encontro.
 *
 * Separado de `encounterDifficulty.js` de propósito: aqui mora o que é da
 * FICHA (somar multiclasse), lá mora o que é da regra de encontro.
 */
export const MIN_LEVEL = 1
export const MAX_LEVEL = 20

/** Nível total: classe primária + multiclasses, clampado em 1..20. */
export function characterLevel(doc) {
  const primary = Number(doc?.info?.level) || 0
  // `Array.isArray` e não `?? []`: uma ficha malformada com `multiclasses`
  // truthy não-array (objeto, string) faria o `.reduce` estourar, enquanto o
  // resto da função trata lixo devolvendo nível 1.
  const mcs = doc?.info?.multiclasses
  const extra = (Array.isArray(mcs) ? mcs : [])
    .reduce((s, m) => s + (Number(m?.level) || 0), 0)
  const total = primary + extra
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, total))
}

/** Aceita o mapa `characterId → doc` que as telas guardam, ou uma lista. */
export function partyLevels(docs) {
  const list = Array.isArray(docs) ? docs : Object.values(docs ?? {})
  return list.map(characterLevel)
}
