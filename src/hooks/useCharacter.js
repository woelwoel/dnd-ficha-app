import { useState, useCallback, useMemo } from 'react'

const DEFAULT_CHARACTER = {
  id: null,
  meta: {
    createdAt: null,
    updatedAt: null,
    version: '1.0',
    schemaVersion: 2,
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
    chosenFeatures: {},
    background: '',
    alignment: '',
    xp: 0,
    scoreMethod: 'manual',
  },
  attributes: {
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
  },
  combat: {
    maxHp: 0,
    currentHp: 0,
    tempHp: 0,
    armorClass: 10,
    speed: 30,
    // Schema v2: pool por tipo de dado ({ d8: { total, used } }).
    hitDice: { pool: {} },
    attacks: [],
    concentrating: { spellIndex: null, spellName: null },
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

export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback para ambientes sem Web Crypto
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Todo patch passa por aqui: carimba `meta.updatedAt`.
 * Aceita patch ou função (prev → next).
 */
const stampMeta = (next) => ({
  ...next,
  meta: { ...next.meta, updatedAt: new Date().toISOString() },
})

export function useCharacter(initialCharacter = null) {
  const [character, setCharacterRaw] = useState(() => {
    if (initialCharacter) return initialCharacter
    const now = new Date().toISOString()
    return {
      ...DEFAULT_CHARACTER,
      id: generateId(),
      meta: { ...DEFAULT_CHARACTER.meta, createdAt: now, updatedAt: now },
    }
  })

  /**
   * Wrapper obrigatório: qualquer update do personagem passa por stampMeta,
   * impossibilitando esquecer de atualizar `meta.updatedAt`.
   */
  const setCharacter = useCallback(updater => {
    setCharacterRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return stampMeta(next)
    })
  }, [])

  /* ── Helpers de patch ────────────────────────────────────────── */

  const patchSection = useCallback((section, field, value) => {
    setCharacter(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }))
  }, [setCharacter])

  const toggleInList = useCallback((section, field, item) => {
    setCharacter(prev => {
      const list = prev[section]?.[field] ?? []
      const next = list.includes(item) ? list.filter(x => x !== item) : [...list, item]
      return { ...prev, [section]: { ...prev[section], [field]: next } }
    })
  }, [setCharacter])

  /* ── Updaters públicos ───────────────────────────────────────── */

  const updateInfo    = useCallback((f, v) => patchSection('info',    f, v), [patchSection])
  const updateCombat  = useCallback((f, v) => patchSection('combat',  f, v), [patchSection])
  const updateTraits  = useCallback((f, v) => patchSection('traits',  f, v), [patchSection])

  const updateAttribute = useCallback((attr, value) => {
    const num = parseInt(value, 10)
    if (Number.isNaN(num)) return
    const clamped = Math.min(30, Math.max(1, num))
    patchSection('attributes', attr, clamped)
  }, [patchSection])

  const toggleSkillProficiency = useCallback(
    skillIndex => toggleInList('proficiencies', 'skills', skillIndex),
    [toggleInList]
  )

  const toggleLanguage = useCallback(
    lang => toggleInList('proficiencies', 'languages', lang),
    [toggleInList]
  )

  const toggleExpertiseSkill = useCallback(skillIndex => {
    setCharacter(prev => {
      const bgSkills = prev.proficiencies.backgroundSkills ?? []
      const hasProf = prev.proficiencies.skills.includes(skillIndex) || bgSkills.includes(skillIndex)
      if (!hasProf) return prev
      const list = prev.proficiencies.expertiseSkills ?? []
      const next = list.includes(skillIndex) ? list.filter(x => x !== skillIndex) : [...list, skillIndex]
      return { ...prev, proficiencies: { ...prev.proficiencies, expertiseSkills: next } }
    })
  }, [setCharacter])

  const updateCurrency = useCallback((key, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0)
    setCharacter(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        currency: { ...prev.inventory.currency, [key]: num },
      },
    }))
  }, [setCharacter])

  const addItem = useCallback(item => {
    setCharacter(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        items: [...prev.inventory.items, { ...item, id: generateId() }],
      },
    }))
  }, [setCharacter])

  const removeItem = useCallback(itemId => {
    setCharacter(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        items: prev.inventory.items.filter(i => i.id !== itemId),
      },
    }))
  }, [setCharacter])

  const updateItem = useCallback((itemId, patch) => {
    setCharacter(prev => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        items: prev.inventory.items.map(i => i.id === itemId ? { ...i, ...patch } : i),
      },
    }))
  }, [setCharacter])

  const addAttack = useCallback(attack => {
    setCharacter(prev => ({
      ...prev,
      combat: {
        ...prev.combat,
        attacks: [...(prev.combat?.attacks ?? []), { ...attack, id: generateId() }],
      },
    }))
  }, [setCharacter])

  const removeAttack = useCallback(attackId => {
    setCharacter(prev => ({
      ...prev,
      combat: {
        ...prev.combat,
        attacks: (prev.combat?.attacks ?? []).filter(a => a.id !== attackId),
      },
    }))
  }, [setCharacter])

  const updateAttack = useCallback((attackId, patch) => {
    setCharacter(prev => ({
      ...prev,
      combat: {
        ...prev.combat,
        attacks: (prev.combat?.attacks ?? []).map(a => a.id === attackId ? { ...a, ...patch } : a),
      },
    }))
  }, [setCharacter])

  const updateSpellcasting = useCallback((f, v) => patchSection('spellcasting', f, v), [patchSection])

  const addSpell = useCallback(spell => {
    setCharacter(prev => {
      if (prev.spellcasting.spells.some(s => s.index === spell.index)) return prev
      return {
        ...prev,
        spellcasting: {
          ...prev.spellcasting,
          spells: [...prev.spellcasting.spells, { ...spell, id: generateId() }],
        },
      }
    })
  }, [setCharacter])

  const removeSpell = useCallback(spellId => {
    setCharacter(prev => ({
      ...prev,
      spellcasting: {
        ...prev.spellcasting,
        spells: prev.spellcasting.spells.filter(s => s.id !== spellId),
      },
    }))
  }, [setCharacter])

  const toggleSlot = useCallback((level, newUsed) => {
    setCharacter(prev => ({
      ...prev,
      spellcasting: {
        ...prev.spellcasting,
        usedSlots: {
          ...(prev.spellcasting.usedSlots || {}),
          [level]: Math.max(0, newUsed),
        },
      },
    }))
  }, [setCharacter])

  // Ações semânticas de slots — usadas por Rest actions.
  const spendSlot = useCallback(level => {
    setCharacter(prev => ({
      ...prev,
      spellcasting: {
        ...prev.spellcasting,
        usedSlots: {
          ...(prev.spellcasting.usedSlots || {}),
          [level]: (prev.spellcasting.usedSlots?.[level] ?? 0) + 1,
        },
      },
    }))
  }, [setCharacter])

  const regainSlot = useCallback(level => {
    setCharacter(prev => ({
      ...prev,
      spellcasting: {
        ...prev.spellcasting,
        usedSlots: {
          ...(prev.spellcasting.usedSlots || {}),
          [level]: Math.max(0, (prev.spellcasting.usedSlots?.[level] ?? 0) - 1),
        },
      },
    }))
  }, [setCharacter])

  const restoreAllSlots = useCallback(() => {
    setCharacter(prev => ({
      ...prev,
      spellcasting: { ...prev.spellcasting, usedSlots: {} },
    }))
  }, [setCharacter])

  /**
   * Define a magia em concentração (PHB p.203). Passar null/''  encerra.
   * Substituição é intencional: apenas uma magia de concentração por vez.
   */
  const setConcentration = useCallback((spell) => {
    setCharacter(prev => ({
      ...prev,
      combat: {
        ...prev.combat,
        concentrating: spell
          ? { spellIndex: spell.index, spellName: spell.name }
          : { spellIndex: null, spellName: null },
      },
    }))
  }, [setCharacter])

  return useMemo(() => ({
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
    updateItem,
    updateSpellcasting,
    addSpell,
    removeSpell,
    toggleSlot,
    spendSlot,
    regainSlot,
    restoreAllSlots,
    setConcentration,
    toggleLanguage,
    addAttack,
    removeAttack,
    updateAttack,
  }), [
    character, setCharacter,
    updateInfo, updateAttribute, updateCombat, updateTraits,
    toggleSkillProficiency, toggleExpertiseSkill,
    updateCurrency, addItem, removeItem, updateItem,
    updateSpellcasting, addSpell, removeSpell,
    toggleSlot, spendSlot, regainSlot, restoreAllSlots, setConcentration,
    toggleLanguage,
    addAttack, removeAttack, updateAttack,
  ])
}
