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
    race: '',
    subrace: '',
    class: '',
    subclass: '',
    level: 1,
    background: '',
    alignment: '',
    xp: 0,
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
    armor: [],
    weapons: [],
    tools: [],
    languages: [],
  },
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

export function useCharacter(initialCharacter = null) {
  const [character, setCharacter] = useState(() => {
    if (initialCharacter) return initialCharacter
    return {
      ...DEFAULT_CHARACTER,
      id: generateId(),
      meta: {
        ...DEFAULT_CHARACTER.meta,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }
  })

  const updateInfo = useCallback((field, value) => {
    setCharacter(prev => ({
      ...prev,
      info: { ...prev.info, [field]: value },
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
    }))
  }, [])

  const updateAttribute = useCallback((attr, value) => {
    const num = parseInt(value, 10)
    if (isNaN(num)) return
    const clamped = Math.min(30, Math.max(1, num))
    setCharacter(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [attr]: clamped },
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
    }))
  }, [])

  const updateCombat = useCallback((field, value) => {
    setCharacter(prev => ({
      ...prev,
      combat: { ...prev.combat, [field]: value },
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
    }))
  }, [])

  const updateTraits = useCallback((field, value) => {
    setCharacter(prev => ({
      ...prev,
      traits: { ...prev.traits, [field]: value },
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
    }))
  }, [])

  const toggleSkillProficiency = useCallback((skillIndex) => {
    setCharacter(prev => {
      const skills = prev.proficiencies.skills
      const updated = skills.includes(skillIndex)
        ? skills.filter(s => s !== skillIndex)
        : [...skills, skillIndex]
      return {
        ...prev,
        proficiencies: { ...prev.proficiencies, skills: updated },
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
    })
  }, [])

  const toggleExpertiseSkill = useCallback((skillIndex) => {
    setCharacter(prev => {
      const expertise = prev.proficiencies.expertiseSkills ?? []
      // Só permite expertise se já for proficiente
      if (!prev.proficiencies.skills.includes(skillIndex)) return prev
      const updated = expertise.includes(skillIndex)
        ? expertise.filter(s => s !== skillIndex)
        : [...expertise, skillIndex]
      return {
        ...prev,
        proficiencies: { ...prev.proficiencies, expertiseSkills: updated },
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
    })
  }, [])

  const toggleSaveProficiency = useCallback((abilityKey) => {
    setCharacter(prev => {
      const saves = prev.proficiencies.savingThrows
      const updated = saves.includes(abilityKey)
        ? saves.filter(s => s !== abilityKey)
        : [...saves, abilityKey]
      return {
        ...prev,
        proficiencies: { ...prev.proficiencies, savingThrows: updated },
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
    })
  }, [])

  const updateCurrency = useCallback((key, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0)
    setCharacter(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        currency: { ...prev.inventory.currency, [key]: num },
      },
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
    }))
  }, [])

  const addItem = useCallback((item) => {
    setCharacter(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        items: [...prev.inventory.items, { ...item, id: Date.now().toString(36) }],
      },
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
    }))
  }, [])

  const removeItem = useCallback((itemId) => {
    setCharacter(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        items: prev.inventory.items.filter(i => i.id !== itemId),
      },
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
    }))
  }, [])

  const updateSpellcasting = useCallback((field, value) => {
    setCharacter(prev => ({
      ...prev,
      spellcasting: { ...prev.spellcasting, [field]: value },
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
    }))
  }, [])

  const addSpell = useCallback((spell) => {
    setCharacter(prev => {
      const already = prev.spellcasting.spells.some(s => s.index === spell.index)
      if (already) return prev
      return {
        ...prev,
        spellcasting: {
          ...prev.spellcasting,
          spells: [...prev.spellcasting.spells, { ...spell, id: generateId() }],
        },
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
    })
  }, [])

  const removeSpell = useCallback((spellId) => {
    setCharacter(prev => ({
      ...prev,
      spellcasting: {
        ...prev.spellcasting,
        spells: prev.spellcasting.spells.filter(s => s.id !== spellId),
      },
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
    }))
  }, [])

  const toggleSlot = useCallback((level, newUsed) => {
    setCharacter(prev => ({
      ...prev,
      spellcasting: {
        ...prev.spellcasting,
        usedSlots: { ...(prev.spellcasting.usedSlots || {}), [level]: Math.max(0, newUsed) },
      },
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
    }))
  }, [])

  return {
    character,
    setCharacter,
    updateInfo,
    updateAttribute,
    updateCombat,
    updateTraits,
    toggleSkillProficiency,
    toggleExpertiseSkill,
    toggleSaveProficiency,
    updateCurrency,
    addItem,
    removeItem,
    updateSpellcasting,
    addSpell,
    removeSpell,
    toggleSlot,
  }
}

export { DEFAULT_CHARACTER, generateId }
