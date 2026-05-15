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

export function isChoiceDone(choice, value) {
  if (choice?.multiSelect) {
    return Array.isArray(value) && value.length >= choice.multiSelect
  }
  return !!value
}

export function getLeveledChoices(classChoicesData, level) {
  return (classChoicesData?.choices ?? [])
    .filter(c => c.level <= level)
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
