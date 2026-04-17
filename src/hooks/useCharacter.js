import { useState, useCallback } from 'react'

const DEFAULT_CHARACTER = {
  id: null,
  meta: {
    createdAt: null,
    updatedAt: null,
    version: '1.0',
  },
  info: {
    name: '',
    playerName: '',
    race: '',
    subrace: '',
    class: '',
    subclass: '',
    level: 1,
    multiclasses: [],
    background: '',
    alignment: '',
    xp: 0,
    scoreMethod: 'manual',
  },
  attributes: {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  },
  combat: {
    maxHp: 0,
    currentHp: 0,
    tempHp: 0,
    armorClass: 10,
    speed: 30,
    hitDice: '1d8',
    deathSaves: { successes: 0, failures: 0 },
  },
  proficiencies: {
    savingThrows: [],
    skills: [],
    expertiseSkills: [],
    backgroundSkills: [],
    armor: [],
    weapons: [],
    tools: [],
    languages: [],
  },
  appliedRacialBonuses: {},
  spellcasting: {
    ability: null,
    usedSlots: {},
    spells: [],
  },
  inventory: {
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    items: [],
  },
  traits: {
    personalityTraits: '',
    ideals: '',
    bonds: '',
    flaws: '',
    featuresAndTraits: '',
    notes: '',
  },
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// Stamp meta.updatedAt em qualquer patch — todo updater passa por aqui
const stampMeta = patch => prev => ({
  ...prev,
  ...patch,
  meta: { ...prev.meta, updatedAt: new Date().toISOString() },
})

// Helpers para reduzir boilerplate: patcha um sub-objeto
const setField    = (section, field, value) => prev => stampMeta({ [section]: { ...prev[section], [field]: value } })(prev)
const toggleInList = (section, field, item) => prev => {
  const list = prev[section][field] ?? []
  const next = list.includes(item) ? list.filter(x => x !== item) : [...list, item]
  return stampMeta({ [section]: { ...prev[section], [field]: next } })(prev)
}

export function useCharacter(initialCharacter = null) {
  const [character, setCharacter] = useState(() => {
    if (initialCharacter) return initialCharacter
    const now = new Date().toISOString()
    return {
      ...DEFAULT_CHARACTER,
      id: generateId(),
      meta: { ...DEFAULT_CHARACTER.meta, createdAt: now, updatedAt: now },
    }
  })

  const updateInfo    = useCallback((field, value) => setCharacter(setField('info',    field, value)), [])
  const updateCombat  = useCallback((field, value) => setCharacter(setField('combat',  field, value)), [])
  const updateTraits  = useCallback((field, value) => setCharacter(setField('traits',  field, value)), [])

  const updateAttribute = useCallback((attr, value) => {
    const num = parseInt(value, 10)
    if (isNaN(num)) return
    const clamped = Math.min(30, Math.max(1, num))
    setCharacter(setField('attributes', attr, clamped))
  }, [])

  const toggleSkillProficiency = useCallback(skillIndex =>
    setCharacter(toggleInList('proficiencies', 'skills', skillIndex)), [])

  const toggleLanguage = useCallback(lang =>
    setCharacter(toggleInList('proficiencies', 'languages', lang)), [])

  const toggleExpertiseSkill = useCallback(skillIndex => {
    setCharacter(prev => {
      // Só permite expertise se já for proficiente (por classe ou antecedente)
      const bgSkills = prev.proficiencies.backgroundSkills ?? []
      if (!prev.proficiencies.skills.includes(skillIndex) && !bgSkills.includes(skillIndex)) return prev
      return toggleInList('proficiencies', 'expertiseSkills', skillIndex)(prev)
    })
  }, [])

  const updateCurrency = useCallback((key, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0)
    setCharacter(prev => stampMeta({
      inventory: { ...prev.inventory, currency: { ...prev.inventory.currency, [key]: num } }
    })(prev))
  }, [])

  const addItem = useCallback(item => setCharacter(prev => stampMeta({
    inventory: { ...prev.inventory, items: [...prev.inventory.items, { ...item, id: generateId() }] }
  })(prev)), [])

  const removeItem = useCallback(itemId => setCharacter(prev => stampMeta({
    inventory: { ...prev.inventory, items: prev.inventory.items.filter(i => i.id !== itemId) }
  })(prev)), [])

  const updateSpellcasting = useCallback((field, value) =>
    setCharacter(setField('spellcasting', field, value)), [])

  const addSpell = useCallback(spell => setCharacter(prev => {
    if (prev.spellcasting.spells.some(s => s.index === spell.index)) return prev
    return stampMeta({
      spellcasting: {
        ...prev.spellcasting,
        spells: [...prev.spellcasting.spells, { ...spell, id: generateId() }],
      }
    })(prev)
  }), [])

  const removeSpell = useCallback(spellId => setCharacter(prev => stampMeta({
    spellcasting: {
      ...prev.spellcasting,
      spells: prev.spellcasting.spells.filter(s => s.id !== spellId),
    }
  })(prev)), [])

  const toggleSlot = useCallback((level, newUsed) => setCharacter(prev => stampMeta({
    spellcasting: {
      ...prev.spellcasting,
      usedSlots: { ...(prev.spellcasting.usedSlots || {}), [level]: Math.max(0, newUsed) },
    }
  })(prev)), [])

  return {
    character,
    setCharacter,
    updateInfo,
    updateAttribute,
    updateCombat,
    updateTraits,
    toggleSkillProficiency,
    toggleExpertiseSkill,
    updateCurrency,
    addItem,
    removeItem,
    updateSpellcasting,
    addSpell,
    removeSpell,
    toggleSlot,
    toggleLanguage,
  }
}

export { generateId }
