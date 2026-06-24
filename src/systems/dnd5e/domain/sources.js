/**
 * Procedência de conteúdo D&D 5e. Fonte única de verdade dos códigos de fonte
 * e seus metadados de exibição. Ausência de `source` num item = 'phb' (básico).
 */
export const SOURCES = {
  phb:   { code: 'phb',   label: "Livro do Jogador",             abbr: 'PHB' },
  tasha: { code: 'tasha', label: 'Caldeirão de Tasha para Tudo', abbr: 'TCE' },
}

/** Código de fonte de um item, com fallback pro básico. */
export function sourceOf(item) {
  return (item && typeof item.source === 'string' && item.source) || 'phb'
}

/** Devolve uma cópia dos itens carimbados com o código de fonte dado. */
export function tagSource(items, code) {
  return (items ?? []).map(it => ({ ...it, source: it?.source ?? code }))
}

/**
 * Filtra um catálogo (talentos, magias, subclasses, itens) pelas fontes ativas
 * da ficha. PHB está SEMPRE incluído. `activeSources` ausente/vazio = só PHB.
 *
 * IMPORTANTE: usar só pra decidir o que é OFERECIDO nos pickers. NÃO usar pra
 * filtrar o que a ficha já tem — conteúdo já escolhido sempre renderiza.
 */
export function filterCatalogBySources(items, activeSources) {
  const active = new Set(['phb', ...(Array.isArray(activeSources) ? activeSources : [])])
  return (items ?? []).filter(it => active.has(sourceOf(it)))
}
