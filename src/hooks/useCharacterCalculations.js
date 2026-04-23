import { useMemo } from 'react'
import {
  getModifier,
  formatModifier,
  getProficiencyBonus,
  calculateSpellSaveDC,
  calculateSpellAttackBonus,
  calculatePassivePerception,
} from '../utils/calculations'
import { calculateMaxHpMulticlass } from '../domain/rules'
import { keyFromAbbr } from '../domain/attributes'

/**
 * Hook de cálculos reativos da ficha.
 *
 * @param {object} character - objeto completo do personagem
 * @param {object|null} classData - dados da classe primária do SRD
 * @param {object} classDataMap - mapa classIndex → classData (para multiclasse)
 * @returns {object} valores derivados memoizados
 */
export function useCharacterCalculations(character, classData = null, classDataMap = {}) {
  const { attributes, info, spellcasting, proficiencies, combat } = character

  const level             = info?.level ?? 1
  const multiclasses      = info?.multiclasses
  const classIndex        = info?.class ?? ''
  const spellAbilityLabel = spellcasting?.ability ?? null
  const saves             = proficiencies?.savingThrows
  const skills            = proficiencies?.skills
  const expertiseSkills   = proficiencies?.expertiseSkills
  const currentHp         = combat?.currentHp ?? 0
  const maxHp             = combat?.maxHp ?? 0
  const { str = 10, dex = 10, con = 10, int: intel = 10, wis = 10, cha = 10 } = attributes ?? {}

  return useMemo(() => {
    const mcs = multiclasses ?? []
    const totalLevel = level + mcs.reduce((s, m) => s + (m.level ?? 0), 0)
    const profBonus = getProficiencyBonus(totalLevel)

    const mods = {
      str: getModifier(str),
      dex: getModifier(dex),
      con: getModifier(con),
      int: getModifier(intel),
      wis: getModifier(wis),
      cha: getModifier(cha),
    }

    let suggestedAC = 10 + mods.dex
    if (classIndex === 'barbaro') suggestedAC += mods.con
    if (classIndex === 'monge')   suggestedAC += mods.wis

    // HP sugerido: multiclasse correto quando há multiclasses
    const fullClassMap = classData
      ? { ...classDataMap, [classIndex]: classData }
      : classDataMap
    const suggestedMaxHp = classData
      ? calculateMaxHpMulticlass(character, fullClassMap)
      : null

    const initiative = mods.dex

    // Atributo de magia: usa o mapa canônico de domain/attributes (FOR/DES/CON/INT/SAB/CAR)
    const spellAbilityKey = spellAbilityLabel ? keyFromAbbr(spellAbilityLabel) : null
    const spellScore = spellAbilityKey ? (attributes?.[spellAbilityKey] ?? 10) : 10

    const spellSaveDC = spellAbilityKey
      ? calculateSpellSaveDC(spellScore, profBonus)
      : null

    const spellAttackBonus = spellAbilityKey
      ? calculateSpellAttackBonus(spellScore, profBonus)
      : null

    const savingThrows = {}
    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      const isProficient = saves?.includes(key) ?? false
      savingThrows[key] = mods[key] + (isProficient ? profBonus : 0)
    }

    const isPerceptionProficient = skills?.includes('perception') ?? false
    const isPerceptionExpert     = expertiseSkills?.includes('perception') ?? false
    const passivePerception = calculatePassivePerception(wis, profBonus, isPerceptionProficient, isPerceptionExpert)

    const hpPercent = maxHp > 0
      ? Math.min(100, Math.round((currentHp / maxHp) * 100))
      : 0

    const hpColor = hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#f59e0b' : '#ef4444'

    return {
      profBonus,
      mods,
      suggestedAC,
      suggestedMaxHp,
      initiative,
      spellSaveDC,
      spellAttackBonus,
      savingThrows,
      passivePerception,
      hpPercent,
      hpColor,
      spellAbilityKey,
      fmt: formatModifier,
    }
  }, [
    level, multiclasses, classIndex,
    str, dex, con, intel, wis, cha,
    spellAbilityLabel, saves, skills, expertiseSkills,
    currentHp, maxHp, classData, classDataMap, attributes, character,
  ])
}
