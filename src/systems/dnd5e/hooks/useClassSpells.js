import { useMemo } from 'react'
import { PT_CLASS_TO_EN } from '../utils/calculations'
import { useSrd } from '../data/SrdProvider'
import { getWarlockPactSlots, getSpellSlots } from '../utils/spellcasting'

/**
 * Lê magias e dados de nível a partir do SrdProvider (cache compartilhado).
 * Nada de fetch aqui — race conditions e requisições duplicadas ficam
 * resolvidas no provider.
 */
export function useClassSpells(classIndex, level, { extraClasses = [] } = {}) {
  const { spells: allSpells, levels, progression } = useSrd()
  // Chave estável pro memo (array literal muda de identidade a cada render).
  const extraClassesKey = extraClasses.join(',')

  const classIndexEn = PT_CLASS_TO_EN[classIndex] ?? classIndex

  const levelData = useMemo(() => {
    // Artífice (Tasha) não está na tabela SRD `levels`. Os truques conhecidos
    // vêm da progressão (cantrips_known por nível); os slots saem do motor.
    if (classIndex === 'artifice') {
      const ck = progression?.artifice?.cantrips_known
      return { cantrips_known: Array.isArray(ck) ? (ck[level - 1] ?? 2) : 2 }
    }
    if (!classIndexEn || !Array.isArray(levels) || levels.length === 0) return null
    const entry = levels.find(l => l.class?.index === classIndexEn && l.level === level)
    return entry?.spellcasting ?? null
  }, [levels, classIndexEn, level, classIndex, progression])

  // Bruxo (Pact Magic) tem só um slot ativo no SRD a cada nível (ex.: nv 5 só
  // spell_slots_level_3 > 0). Mas pela PHB p.107 ele PODE aprender magias de
  // qualquer nível até o slotLevel atual. Sem esse branch o wizard só mostra
  // a tab do nível máximo, escondendo magias de níveis inferiores.
  // Outras classes seguem a regra normal: nível com slot > 0 = aprendível.
  const slotLevels = useMemo(() => {
    // Artífice: slots derivam do motor de meio-conjurador (a tabela SRD não o
    // tem). Ex.: nv1 → [1]; nv5 → [1,2]; nv9 → [1,2,3].
    if (classIndex === 'artifice') {
      const slots = getSpellSlots('artifice', level, [])
      return slots ? Object.keys(slots).map(Number).sort((a, b) => a - b) : []
    }
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
    // Alma Favorecida (Feiticeiro/XGE) conjura também da lista de Clérigo:
    // o consumo passa extraClasses=['clerigo']. União das listas aceitas.
    const accepted = [classIndex, ...extraClasses]
    return allSpells.filter(s => accepted.some(c => s.classes?.includes(c)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSpells, classIndex, extraClassesKey])

  const availableTabs = useMemo(() => {
    const lvls = new Set(classSpells.map(s => s.level))
    return [0, ...slotLevels].filter(l => lvls.has(l))
  }, [classSpells, slotLevels])

  return { allSpells, classSpells, levelData, slotLevels, availableTabs }
}
