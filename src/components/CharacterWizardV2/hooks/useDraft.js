import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'wizard-v2-draft'
const AUTOSAVE_MS = 500

export const INITIAL_DRAFT_V2 = {
  settings: {
    abilityScoreMethod: 'standard-array',
    allowFeats: false,
    allowMulticlass: false,
    startLevel: 1,
  },
  name: '', playerName: '', alignment: '', appearance: '',
  race: '', subrace: '', racialBonuses: {},
  racialAbilityChoices: [], racialSkills: [], draconicAncestry: '', racialCantrip: '',
  class: '', level: 1, chosenFeatures: {}, savingThrows: [],
  asiChoices: {},
  multiclasses: [],
  spellcastingAbility: null, hitDice: '1d8',
  background: '', backgroundSkills: [], backgroundItems: [],
  backgroundGold: 0,
  classEquipmentChoice: 'equipment', classEquipmentChoices: {},
  classEquipmentPicks: {}, classStartingGold: 0,
  baseAttributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  rolledScores: [],
  chosenSkills: [],
  spells: [], bonusSpells: [],
}

function shallowEqualDraft(a, b) {
  // Comparação JSON é suficiente: drafts são objetos serializáveis
  // e sempre passam por sessionStorage (round-trip JSON), então qualquer
  // diferença que não sobrevive a JSON.stringify também não importa.
  return JSON.stringify(a) === JSON.stringify(b)
}

export function useDraft({ initialSettings = null, resume = false } = {}) {
  const [draft, setDraft] = useState(() => {
    if (resume) {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        try { return JSON.parse(saved) } catch { /* fallthrough */ }
      }
    }
    if (initialSettings) {
      const merged = {
        ...INITIAL_DRAFT_V2,
        settings: { ...INITIAL_DRAFT_V2.settings, ...initialSettings },
      }
      // startLevel da campanha → nível inicial do personagem
      if (typeof initialSettings.startLevel === 'number' && initialSettings.startLevel > 0) {
        merged.level = initialSettings.startLevel
      }
      return merged
    }
    return INITIAL_DRAFT_V2
  })

  const timerRef = useRef(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    }, AUTOSAVE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [draft])

  const updateDraft = useCallback(patch => {
    setDraft(prev => ({ ...prev, ...patch }))
  }, [])

  const resetDraft = useCallback(() => {
    setDraft(INITIAL_DRAFT_V2)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const hasChanges = useMemo(
    () => !shallowEqualDraft(draft, INITIAL_DRAFT_V2),
    [draft],
  )

  return { draft, updateDraft, resetDraft, hasChanges }
}
