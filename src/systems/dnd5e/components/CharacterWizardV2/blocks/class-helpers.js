/**
 * Resolve `multiSelect` efetivo de uma choice considerando level scaling.
 *
 * Suporta dois formatos:
 *  - `multiSelect: N`             — fixo, mesmo em todo nível.
 *  - `multiSelectByLevel: { 3:3, 7:5, 10:7, 15:9 }` — escala: pega o maior
 *    threshold ≤ characterLevel. Útil pra escolhas que crescem com o
 *    personagem (ex.: manobras do Mestre de Combate).
 *
 * Retorna 0 (single-select) quando nenhum dos dois estiver presente.
 */
export function resolveMultiSelect(choice, characterLevel = 1) {
  if (choice?.multiSelect) return choice.multiSelect
  const byLevel = choice?.multiSelectByLevel
  if (byLevel && typeof byLevel === 'object') {
    const thresholds = Object.keys(byLevel)
      .map(Number)
      .filter(n => Number.isFinite(n) && n <= characterLevel)
      .sort((a, b) => b - a)
    if (thresholds.length > 0) return byLevel[thresholds[0]]
  }
  return 0
}

export function isASIChoiceComplete(choice) {
  if (!choice) return false
  if (choice.type === 'asi') {
    const total = Object.values(choice.bonuses ?? {}).reduce((s, v) => s + v, 0)
    return total === 2
  }
  if (choice.type === 'feat') {
    if (!choice.featIndex) return false
    const choices = choice.featAttrBonus?.choices ?? []
    if (choices.length > 1) return !!choice.featChosenAttr
    return true
  }
  return false
}

const ASI_ATTR_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']

/** Soma o bônus de um asiChoice (asi ou talento) num mapa de atributos. */
function applyAsiChoiceBonus(map, choice) {
  if (!choice) return
  if (choice.type === 'asi') {
    for (const [k, v] of Object.entries(choice.bonuses ?? {})) {
      map[k] = (map[k] ?? 0) + v
    }
  } else if (choice.type === 'feat' && choice.featAttrBonus) {
    const attr = choice.featChosenAttr ?? choice.featAttrBonus.choices?.[0]
    if (attr) map[attr] = (map[attr] ?? 0) + (choice.featAttrBonus.amount ?? 1)
  }
}

/**
 * Atributos "atuais" para exibir o ASI de um nível: base + bônus racial +
 * todos os OUTROS ASIs/talentos já escolhidos (exceto o do nível `excludeLevel`).
 * Permite mostrar "FOR 17 → 19" e respeitar o teto 20 considerando o que já
 * foi alocado em outros níveis. O bônus racial entra no valor base.
 */
export function currentAttributesForASI(draft, excludeLevel) {
  const map = {}
  for (const k of ASI_ATTR_KEYS) {
    map[k] = (draft?.baseAttributes?.[k] ?? 0) + (draft?.racialBonuses?.[k] ?? 0)
  }
  for (const [lvl, choice] of Object.entries(draft?.asiChoices ?? {})) {
    if (Number(lvl) === Number(excludeLevel)) continue
    applyAsiChoiceBonus(map, choice)
  }
  return map
}

export function isChoiceDone(choice, value, characterLevel = 1) {
  const effectiveMulti = resolveMultiSelect(choice, characterLevel)
  if (effectiveMulti > 0) {
    return Array.isArray(value) && value.length >= effectiveMulti
  }
  return !!value
}

/**
 * Lista de escolhas que se aplicam até o nível atual.
 *
 * Suporta o campo opcional `requires: { fieldKey: requiredValue }` na escolha.
 * Quando presente, a escolha só aparece se TODOS os pares chosenFeatures
 * baterem. Usado pra escolhas condicionais (ex: druid_land_type só faz sentido
 * se druid_circle === 'terra').
 */
export function getLeveledChoices(classChoicesData, level, chosenFeatures = {}) {
  return (classChoicesData?.choices ?? [])
    .filter(c => c.level <= level)
    .filter(c => {
      if (!c.requires) return true
      return Object.entries(c.requires).every(([k, v]) => chosenFeatures?.[k] === v)
    })
    .sort((a, b) => a.level - b.level)
}

export function computeBonusCantripsNeeded(leveledChoices, chosenFeatures) {
  return leveledChoices.reduce((sum, c) => {
    const val = chosenFeatures?.[c.id]
    if (c.multiSelect) {
      const vals = Array.isArray(val) ? val : []
      return sum + vals.reduce((s, v) =>
        s + (c.options.find(o => o.value === v)?.grants?.bonusCantrips ?? 0), 0)
    }
    const opt = c.options.find(o => o.value === val)
    return sum + (opt?.grants?.bonusCantrips ?? 0)
  }, 0)
}

export function getProgressionLevels(progressionData, level) {
  return (progressionData?.levels ?? [])
    .filter(l => l.level <= level)
    .sort((a, b) => a.level - b.level)
}

export function getASILevels(progressionData, level) {
  return getProgressionLevels(progressionData, level)
    .filter(l => l.features?.some(f => f.name === 'Aumento de Atributo'))
    .map(l => l.level)
}
