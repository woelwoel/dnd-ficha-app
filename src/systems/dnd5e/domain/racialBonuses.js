import { ABBR_TO_KEY, ATTR_NAME_TO_KEY } from '../../../utils/calculations'

/**
 * Bônus raciais de atributo.
 *
 * O dado SRD usa nomes completos ("Força") no campo `ability`; aceitamos
 * abreviações ("FOR") por robustez. (Histórico: `computeBonuses` mapeava só
 * por abreviação, então TODO bônus racial padrão era descartado — corrigido.)
 */

// O Humano Variante SUBSTITUI o +1-em-tudo do humano base por 2 escolhas livres.
// Logo, quando essa subraça está ativa, ignoramos os bônus da raça base.
export const VARIANT_HUMAN_SUBRACE = 'tracos-raciais-alternativos'

/** Resolve uma label de atributo ("Força" ou "FOR") para a chave ('str'). */
export function abilityKey(ability) {
  return ATTR_NAME_TO_KEY[ability] ?? ABBR_TO_KEY[ability] ?? null
}

/**
 * Bônus FIXOS (sem escolha livre) de uma combinação raça/subraça.
 * Retorna um mapa { str: 2, con: 1, ... }.
 */
export function fixedRacialBonuses(race, subrace) {
  const isVariantHuman = (subrace?.index ?? subrace?.name) === VARIANT_HUMAN_SUBRACE
  const entries = [
    ...(isVariantHuman ? [] : (race?.ability_bonuses ?? [])),
    ...(subrace?.ability_bonuses ?? []),
  ]
  const map = {}
  for (const b of entries) {
    if (b.ability.includes('escolha')) continue
    const key = abilityKey(b.ability)
    if (key) map[key] = (map[key] ?? 0) + b.bonus
  }
  return map
}
