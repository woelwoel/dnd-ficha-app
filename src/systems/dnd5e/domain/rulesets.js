/**
 * Geração de regra de D&D (o eixo `ruleset`). SUBSTITUTIVO, não aditivo:
 * troca a resposta de perguntas que já existem, ao contrário de `source`
 * (domain/sources.js), que só acrescenta opções ao mesmo picker.
 *
 * O descritor é DADO. Divergência que não couber em dado vira hook nomeado —
 * e cada hook é sinal de alerta de que a abordagem está degenerando em
 * ramificação espalhada por rules.js.
 */

export const DEFAULT_RULESET = '2014'

export const RULESETS = {
  '2014': {
    id: '2014',
    label: 'D&D 5e (2014)',
    sources: ['phb', 'tasha', 'xanathar'],
    /** Quem concede aumento de atributo na origem: 'race' | 'background'. */
    abilityBonusFrom: 'race',
    /** Categoria de talento concedida pelo antecedente, ou false. */
    backgroundGrantsFeat: false,
    /** Nível uniforme de subclasse, ou null quando é por classe. */
    subclassLevel: null,
  },
  '2024': {
    id: '2024',
    label: 'D&D 2024',
    sources: ['phb2024'],
    abilityBonusFrom: 'background',
    backgroundGrantsFeat: 'origem',
    subclassLevel: 3,
  },
}

/**
 * Geração declarada na ficha. Trata APENAS ausência (ficha legada → 2014);
 * validade é responsabilidade do schema, não daqui.
 */
export function rulesetOf(character) {
  return character?.meta?.settings?.ruleset ?? DEFAULT_RULESET
}

/** Descritor da ficha, com fallback defensivo para valor desconhecido. */
export function rulesetFor(character) {
  return RULESETS[rulesetOf(character)] ?? RULESETS[DEFAULT_RULESET]
}

/**
 * Fontes efetivamente oferecidas à ficha: interseção das fontes ligadas pelo
 * jogador com as permitidas pela geração. Ficha sem `sources` recebe a fonte
 * base da geração.
 */
export function sourcesFor(character) {
  const rs = rulesetFor(character)
  const allowed = new Set(rs.sources)
  const raw = character?.meta?.settings?.sources
  const active = Array.isArray(raw) ? raw : []
  const kept = active.filter(s => allowed.has(s))
  return kept.length ? kept : [rs.sources[0]]
}
