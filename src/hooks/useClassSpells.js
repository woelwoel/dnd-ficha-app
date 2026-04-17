import { useState, useEffect, useMemo } from 'react'
import { PT_CLASS_TO_EN, normalizeSpell } from '../utils/calculations'

/**
 * Carrega o catálogo de magias PT, os dados de nível da classe (slots,
 * cantrips_known, spells_known) e deriva slotLevels / classSpells / availableTabs.
 */
export function useClassSpells(classIndex, level) {
  const [allSpells, setAllSpells] = useState([])
  const [levelData, setLevelData] = useState(null)

  useEffect(() => {
    fetch('/srd-data/phb-spells-pt.json')
      .then(r => r.json())
      .then(data => setAllSpells(data.map(normalizeSpell)))
      .catch(() => {})
  }, [])

  const classIndexEn = PT_CLASS_TO_EN[classIndex] ?? classIndex
  useEffect(() => {
    if (!classIndexEn) { setLevelData(null); return }
    fetch('/srd-data/5e-SRD-Levels.json')
      .then(r => r.json())
      .then(data => {
        const entry = data.find(l => l.class?.index === classIndexEn && l.level === level)
        setLevelData(entry?.spellcasting ?? null)
      })
      .catch(() => setLevelData(null))
  }, [classIndexEn, level])

  const slotLevels = useMemo(() => (
    levelData
      ? [1,2,3,4,5,6,7,8,9].filter(l => (levelData[`spell_slots_level_${l}`] || 0) > 0)
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
