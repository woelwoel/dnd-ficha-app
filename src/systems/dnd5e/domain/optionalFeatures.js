/**
 * Features OPCIONAIS de classe (Caldeirão de Tasha).
 *
 * Uma feature opcional é uma escolha `optional: true` que o jogador liga/desliga
 * na ficha (default = desligada). Dois tipos:
 *  - SUBSTITUIÇÃO: carrega `featureName` (nome da feature-base na progressão).
 *    Quando ligada, `resolveChosenFeature` (FeaturesTab) troca name/desc da base.
 *  - ADIÇÃO: `addsFeature: true` (sem `featureName`). Quando ligada, é injetada
 *    como card próprio via `getChosenAdditions`.
 *
 * Módulo puro (sem React) para ser testável isoladamente.
 */
import { filterChoiceBySources } from './sources'

export function isOptionalChoice(choice) {
  return !!choice?.optional
}

/** Adição = opcional, sem feature-base pra trocar (addsFeature ou sem featureName). */
export function isAdditionChoice(choice) {
  return isOptionalChoice(choice) && (!!choice.addsFeature || !choice.featureName)
}

/**
 * Variantes opcionais oferecíveis pro toggle: optional, dentro do nível e com
 * pelo menos uma option de fonte ativa. `options` já vêm filtradas por fonte.
 */
export function getOptionalVariants(classChoicesForClass, level, activeSources) {
  return (classChoicesForClass?.choices ?? [])
    .filter(isOptionalChoice)
    .filter(c => (c.level ?? 0) <= level)
    .map(c => filterChoiceBySources(c, {}, activeSources))
    .filter(c => Array.isArray(c.options) && c.options.length > 0)
    .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
}

/**
 * Adições LIGADAS, prontas pra virar card de feature. Substituições são
 * ignoradas aqui (quem as renderiza é o resolveChosenFeature).
 */
export function getChosenAdditions(classChoicesForClass, level, chosenFeatures = {}) {
  const out = []
  for (const c of classChoicesForClass?.choices ?? []) {
    if (!isAdditionChoice(c)) continue
    if ((c.level ?? 0) > level) continue
    const val = chosenFeatures?.[c.id]
    if (!val) continue
    const opt = (c.options ?? []).find(o => o.value === val)
    if (!opt) continue
    out.push({
      id: `${c.id}-${val}`,
      name: opt.name,
      desc: opt.desc,
      level: c.level,
      combat: opt.combat,
      category: opt.category,
      actionType: opt.actionType,
    })
  }
  return out
}
