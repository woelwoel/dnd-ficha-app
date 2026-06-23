import { useMemo } from 'react'
import { PT_CLASS_TO_EN } from '../utils/calculations'
import { useSrd } from '../systems/dnd5e/data/SrdProvider'
import { getWarlockPactSlots } from '../utils/spellcasting'

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

  // Bruxo (Pact Magic) tem só um slot ativo no SRD a cada nível (ex.: nv 5 só
  // spell_slots_level_3 > 0). Mas pela PHB p.107 ele PODE aprender magias de
  // qualquer nível até o slotLevel atual. Sem esse branch o wizard só mostra
  // a tab do nível máximo, escondendo magias de níveis inferiores.
  // Outras classes seguem a regra normal: nível com slot > 0 = aprendível.
  const slotLevels = useMemo(() => {
    if (!levelData) return []
    if (classIndex === 'bruxo') {
      const pact = getWarlockPactSlots(level)
      if (!pact) return []
      return Array.from({ length: pact.slotLevel }, (_, i) => i + 1)
    }
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(l => (levelData[`spell_slots_level_${l}`] || 0) > 0)
  }, [levelData, classIndex, level])

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
