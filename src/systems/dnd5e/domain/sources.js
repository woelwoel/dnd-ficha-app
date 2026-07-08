/**
 * Procedência de conteúdo D&D 5e. Fonte única de verdade dos códigos de fonte
 * e seus metadados de exibição. Ausência de `source` num item = 'phb' (básico).
 */
export const SOURCES = {
  phb:      { code: 'phb',      label: "Livro do Jogador",                       abbr: 'PHB' },
  tasha:    { code: 'tasha',    label: 'Caldeirão de Tasha para Tudo',           abbr: 'TCE' },
  xanathar: { code: 'xanathar', label: 'Guia de Xanathar para Todas as Coisas',  abbr: 'XGE' },
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

/**
 * Filtra as `options` de UMA choice pelas fontes ativas, SEMPRE preservando
 * a(s) opção(ões) já escolhida(s) em `chosenFeatures[choice.id]` — conteúdo já
 * escolhido nunca some, mesmo que a fonte tenha sido desligada depois.
 *
 * Aceita o valor escolhido como: string única, string "a,b" (multiSelect da
 * ficha) ou array (multiSelect do wizard). Pura: não muta `choice`.
 */
export function filterChoiceBySources(choice, chosenFeatures, activeSources) {
  if (!choice || !Array.isArray(choice.options)) return choice
  const offered = filterCatalogBySources(choice.options, activeSources)
  const raw = chosenFeatures?.[choice.id]
  const chosenVals = Array.isArray(raw)
    ? raw
    : typeof raw === 'string' && raw.length
      ? raw.split(',').filter(Boolean)
      : raw != null && raw !== ''
        ? [raw]
        : []
  if (chosenVals.length === 0) return { ...choice, options: offered }
  const offeredSet = new Set(offered.map(o => o.value))
  const preserved = choice.options.filter(o => chosenVals.includes(o.value) && !offeredSet.has(o.value))
  return { ...choice, options: [...offered, ...preserved] }
}
