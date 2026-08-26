import { RULESETS, is2024, rulesetOf } from '../domain/ruleset'

/**
 * Selo read-only do conjunto de regras. Só aparece em ficha 2024: 2014 é o
 * padrão silencioso, e marcá-lo poluiria toda ficha existente sem informar
 * nada. O ruleset é imutável, então o selo não é clicável.
 */
export function RulesetBadge({ character }) {
  if (!is2024(character)) return null
  const rs = RULESETS[rulesetOf(character)]
  return (
    <span
      className="v2-chip"
      title={`Esta ficha usa as regras de ${rs.label}. A escolha é definitiva.`}
    >
      {rs.abbr}
    </span>
  )
}
