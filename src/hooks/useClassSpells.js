import { useMemo } from 'react'
import { PT_CLASS_TO_EN } from '../utils/calculations'
import { useSrd } from '../providers/SrdProvider'

/**
 * Lê magias e dados de nível a partir do SrdProvider (cache compartilhado).
 * Nada de fetch aqui — race conditions e requisições duplicadas ficam
 * resolvidas no provider.
 */
export function useClassSpells(classIndex, level) {
  const { spells: allSpells, levels } = useSrd()

  const classIndexEn = PT_CLASS_TO_EN[classIndex] ?? classIndex

  const levelData = useMemo(() => {
    if (!classIndexEn || !Array.isArray(levels) || levels.length === 0) return null
    const entry = levels.find(l => l.class?.index === classIndexEn && l.level === level)
    return entry?.spellcasting ?? null
  }, [levels, classIndexEn, level])

  const slotLevels = useMemo(() => (
    levelData
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(l => (levelData[`spell_slots_level_${l}`] || 0) > 0)
      : []
  ), [levelData])

  const classSpells = useMemo(() => {
    if (!classIndex) return allSpells
    return allSpells.filter(s => s.classes?.includes(classIndex))
  }, [allSpells, classIndex])

  const availableTabs = useMemo(() => {
    const lvls = new Set(classSpells.map(s => s.level))
    return [0, ...slotLevels].filter(l => lvls.has(l))
  }, [classSpells, slotLevels])

  return { allSpells, classSpells, levelData, slotLevels, availableTabs }
}
