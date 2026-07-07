import { useState, useCallback, useMemo } from 'react'
import { SCHEMA_VERSION } from '../domain/characterSchema'
import { calculateArmorClass, getEquippedArmor } from '../domain/equipment'
import { getModifier } from '../utils/calculations'
import {
  defaultClassFeatureUses, mergeFeatureUses,
  syncGrantedSpells,
  applyDamage as applyDamagePure,
  applyHealing as applyHealingPure,
  gainTempHp as gainTempHpPure,
  stabilizeCharacter as stabilizeCharacterPure,
  rollDeathSave as rollDeathSavePure,
} from '../domain/rules'
import { upsertEffect, removeEffect, pruneOnConcentrationChange } from '../domain/activeEffects'

/**
 * Resolve a lista de feature-uses para spend/regain. Se o caller passou `list`
 * (ex.: SheetContent, que tem `classChoices` no memo), usa ela. Senão re-deriva
 * dos defaults — mas PRESERVA entradas persistidas ausentes dos defaults deste
 * hook (os trackers de subclasse dependem de `classChoices`, indisponível aqui).
 * Sem essa preservação, um gasto por caller sem lista (ex.: ManeuversPanel)
 * zeraria os `used` dos trackers de subclasse ao reescrever classFeatureUses.
 */
function resolveFeatureUseList(prev, list) {
  if (list) return list
  const persisted = prev.combat?.classFeatureUses ?? []
  const derived = mergeFeatureUses(persisted, defaultClassFeatureUses(prev))
  const known = new Set(derived.map(u => u.id))
  return [...derived, ...persisted.filter(u => !known.has(u.id))]
}

export const DEFAULT_CHARACTER = {
  id: null,
  meta: {
    createdAt: null,
    updatedAt: null,
    version: '1.0',
    schemaVersion: SCHEMA_VERSION,
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
    // v3
    feats: [],
    asiOrFeatByLevel: {},
    // v4
    portrait: null,   // data URL base64 da imagem do personagem
  },
  attributes: {
    str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
  },
  combat: {
    maxHp: 0,
    currentHp: 0,
    tempHp: 0,
    armorClass: 10,
    speed: 9, // metros — ver characterSchema.js (schema default 9)
    // Schema v2+: pool por tipo de dado ({ d8: { total, used } }).
    hitDice: { pool: {} },
    attacks: [],
    concentrating: { spellIndex: null, spellName: null },
    deathSaves: { successes: 0, failures: 0 },
    // v3: usos limitados de class features (Action Surge, Ki, etc.).
    classFeatureUses: [],
    // v4
    conditions: [],      // IDs de condições ativas (poisoned, stunned, …)
    inspiration: false,  // Inspiração
    exhaustion: 0,       // Nível de exaustão 0-6
    activeEffects: [],   // Efeitos ativos de magia (buffs) — spec 2026-07-07
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
    abilitiesByClass: {},
    usedSlots: {},
    pactSlotsUsed: 0,
    spellbook: [],
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
    setCharacter(prev => {
      const newItems = prev.inventory.items.map(i => i.id === itemId ? { ...i, ...patch } : i)
      const base = {
        ...prev,
        inventory: { ...prev.inventory, items: newItems },
      }
      if ('equipped' in patch) {
        const attrs = prev.attributes ?? {}
        const mods = {
          str: getModifier(attrs.str ?? 10),
          dex: getModifier(attrs.dex ?? 10),
          con: getModifier(attrs.con ?? 10),
          int: getModifier(attrs.int ?? 10),
          wis: getModifier(attrs.wis ?? 10),
          cha: getModifier(attrs.cha ?? 10),
        }
        const { armor, hasShield } = getEquippedArmor(newItems)
        const { ac } = calculateArmorClass({
          mods,
          attributes: attrs,
          classIndex: prev.info?.class ?? '',
          classes: [
            { class: prev.info?.class, level: prev.info?.level ?? 0 },
            ...(prev.info?.multiclasses ?? []),
          ],
          armor,
          hasShield,
          armorProficiencies: prev.proficiencies?.armor ?? [],
        })
        return { ...base, combat: { ...base.combat, armorClass: ac } }
      }
      return base
    })
  }, [setCharacter])

  const addAttack = useCallback(attack => {
    setCharacter(prev => {
      // Respeita id explícito se fornecido (ex.: weapon-<itemId> pra ataques
      // criados ao equipar arma do inventário). Caso contrário gera novo.
      // Idempotente: se já existir um attack com o id, NÃO duplica.
      const incomingId = attack?.id
      const existing = prev.combat?.attacks ?? []
      if (incomingId && existing.some(a => a.id === incomingId)) return prev
      return {
        ...prev,
        combat: {
          ...prev.combat,
          attacks: [...existing, { id: incomingId ?? generateId(), ...attack }],
        },
      }
    })
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

  /**
   * Define o valor de uma escolha de classe (chosenFeatures[choiceId]).
   * Usado pra "backfill" — escolher Mestre de Combate manobras, Bárbaro
   * totens etc. em personagens criados antes do picker existir.
   *
   * Aceita string (single-select) ou array (multi-select).
   */
  const setChosenFeature = useCallback((choiceId, value) => {
    setCharacter(prev => syncGrantedSpells({
      ...prev,
      info: {
        ...prev.info,
        chosenFeatures: {
          ...(prev.info?.chosenFeatures ?? {}),
          [choiceId]: value,
        },
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

  /**
   * Alterna o flag `prepared` de uma magia (Mago/Clérigo/Druida/Paladino).
   * Truques são sempre conjuráveis — o toggle só faz sentido em magias com
   * nível ≥ 1. PHB p.114 (Mago) / p.58 (Clérigo) etc.
   */
  const togglePrepared = useCallback(spellId => {
    setCharacter(prev => ({
      ...prev,
      spellcasting: {
        ...prev.spellcasting,
        spells: prev.spellcasting.spells.map(s =>
          s.id === spellId && s.level > 0
            ? { ...s, prepared: s.prepared === false ? true : false }
            : s
        ),
      },
    }))
  }, [setCharacter])

  /**
   * Define `usedSlots[level]`. Aceita `maxSlots` opcional para clampar
   * automaticamente (`Math.min(max, value)`), evitando estado inválido.
   */
  const toggleSlot = useCallback((level, newUsed, maxSlots = null) => {
    setCharacter(prev => {
      const max = maxSlots?.[level] ?? Infinity
      return {
        ...prev,
        spellcasting: {
          ...prev.spellcasting,
          usedSlots: {
            ...(prev.spellcasting.usedSlots || {}),
            [level]: Math.max(0, Math.min(max, newUsed)),
          },
        },
      }
    })
  }, [setCharacter])

  // Ações semânticas de slots — usadas por Rest actions.
  const spendSlot = useCallback((level, maxSlots = null) => {
    setCharacter(prev => {
      const cur = prev.spellcasting.usedSlots?.[level] ?? 0
      const max = maxSlots?.[level] ?? Infinity
      return {
        ...prev,
        spellcasting: {
          ...prev.spellcasting,
          usedSlots: {
            ...(prev.spellcasting.usedSlots || {}),
            [level]: Math.min(max, cur + 1),
          },
        },
      }
    })
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
      spellcasting: { ...prev.spellcasting, usedSlots: {}, pactSlotsUsed: 0 },
    }))
  }, [setCharacter])

  /* ── Pact Magic (Bruxo) — slots separados ────────────────────── */

  const spendPactSlot = useCallback((maxQty = Infinity) => {
    setCharacter(prev => {
      const cur = prev.spellcasting.pactSlotsUsed ?? 0
      return {
        ...prev,
        spellcasting: { ...prev.spellcasting, pactSlotsUsed: Math.min(maxQty, cur + 1) },
      }
    })
  }, [setCharacter])

  const regainPactSlot = useCallback(() => {
    setCharacter(prev => ({
      ...prev,
      spellcasting: {
        ...prev.spellcasting,
        pactSlotsUsed: Math.max(0, (prev.spellcasting.pactSlotsUsed ?? 0) - 1),
      },
    }))
  }, [setCharacter])

  /* ── Class Feature Uses (Action Surge, Ki, etc.) ─────────────── */

  const setClassFeatureUses = useCallback(uses => {
    setCharacter(prev => ({
      ...prev,
      combat: { ...prev.combat, classFeatureUses: uses ?? [] },
    }))
  }, [setCharacter])

  const spendFeatureUse = useCallback((id, list = null) => {
    setCharacter(prev => {
      const base = resolveFeatureUseList(prev, list)
      const next = base.map(u => u.id === id
        ? { ...u, used: Math.min(u.max, (u.used ?? 0) + 1) }
        : u)
      return { ...prev, combat: { ...prev.combat, classFeatureUses: next } }
    })
  }, [setCharacter])

  const regainFeatureUse = useCallback((id, list = null) => {
    setCharacter(prev => {
      const base = resolveFeatureUseList(prev, list)
      const next = base.map(u => u.id === id
        ? { ...u, used: Math.max(0, (u.used ?? 0) - 1) }
        : u)
      return { ...prev, combat: { ...prev.combat, classFeatureUses: next } }
    })
  }, [setCharacter])

  /* ── Death Saves ────────────────────────────────────────────── */

  const updateDeathSaves = useCallback((type, value) => {
    setCharacter(prev => ({
      ...prev,
      combat: {
        ...prev.combat,
        deathSaves: {
          ...(prev.combat.deathSaves ?? { successes: 0, failures: 0 }),
          [type]: Math.max(0, Math.min(3, value)),
        },
      },
    }))
  }, [setCharacter])

  /* ── Dano, Cura, Testes de Morte (camada pura em rules.js) ──── */

  // Guarda os últimos sideEffects da última operação de dano/cura.
  // Útil para UI exibir banners (instakill, drop, revival, concentration DC).
  const [lastDamageEvent, setLastDamageEvent] = useState(null)

  /**
   * Aplica dano. Delega para rules.applyDamage e propaga sideEffects.
   * @returns sideEffects do dano para o caller exibir feedback.
   */
  const applyDamage = useCallback((amount, opts = {}) => {
    let captured = null
    setCharacter(prev => {
      const { character: next, sideEffects } = applyDamagePure(prev, amount, opts)
      captured = sideEffects
      return next
    })
    setLastDamageEvent({ kind: 'damage', ...captured })
    return captured
  }, [setCharacter])

  /**
   * Cura. Delega para rules.applyHealing. Revival a partir de 0 HP zera
   * testes de morte e remove isStable automaticamente.
   */
  const applyHealing = useCallback((amount) => {
    let captured = null
    setCharacter(prev => {
      const { character: next, sideEffects } = applyHealingPure(prev, amount)
      captured = sideEffects
      return next
    })
    setLastDamageEvent({ kind: 'heal', ...captured })
    return captured
  }, [setCharacter])

  /** Ganha PV temporários (PHB p.198: não acumulam, vale o maior). */
  const gainTempHp = useCallback((amount) => {
    setCharacter(prev => gainTempHpPure(prev, amount).character)
  }, [setCharacter])

  /** Estabiliza personagem a 0 HP (DC 10 Medicina ou spare-the-dying). */
  const stabilize = useCallback(() => {
    setCharacter(prev => stabilizeCharacterPure(prev))
  }, [setCharacter])

  /**
   * Rola um teste de morte. Caller pode passar `roll` (1-20) para forçar
   * resultado (mestre). Retorna o `result` da rolagem para UI/DiceHistory.
   * Também propaga o resultado para `lastDamageEvent` (banner).
   */
  const rollDeathSave = useCallback((opts = {}) => {
    let captured = null
    setCharacter(prev => {
      const { character: next, result } = rollDeathSavePure(prev, opts)
      captured = result
      return next
    })
    if (captured && !captured.blocked) {
      setLastDamageEvent({ kind: 'deathSave', ...captured })
    }
    return captured
  }, [setCharacter])

  const clearLastDamageEvent = useCallback(() => setLastDamageEvent(null), [])

  /* ── Condições (Poisoned, Stunned, …) ────────────────────── */

  const toggleCondition = useCallback(conditionId => {
    setCharacter(prev => {
      const list = prev.combat?.conditions ?? []
      const next = list.includes(conditionId)
        ? list.filter(c => c !== conditionId)
        : [...list, conditionId]
      return { ...prev, combat: { ...prev.combat, conditions: next } }
    })
  }, [setCharacter])

  /* ── Inspiração e Exaustão ─────────────────────────────────── */

  const setInspiration = useCallback(val => {
    setCharacter(prev => ({ ...prev, combat: { ...prev.combat, inspiration: !!val } }))
  }, [setCharacter])

  const setExhaustion = useCallback(level => {
    const clamped = Math.max(0, Math.min(6, Number(level)))
    setCharacter(prev => ({
      ...prev,
      combat: {
        ...prev.combat,
        exhaustion: clamped,
        // PHB p.291: nível 6 = morte. Auto-marca isDead.
        // Se for reduzido abaixo de 6, NÃO ressuscita automaticamente (precisa Reviver).
        isDead: clamped >= 6 ? true : (prev.combat?.isDead ?? false),
      },
    }))
  }, [setCharacter])

  /**
   * Consome inspiração (PHB p.125). Caller pode chamar essa função antes de
   * uma rolagem que precisa de vantagem. Retorna true se havia inspiração,
   * false se não.
   */
  const consumeInspiration = useCallback(() => {
    let hadIt = false
    setCharacter(prev => {
      hadIt = !!prev.combat?.inspiration
      if (!hadIt) return prev
      return { ...prev, combat: { ...prev.combat, inspiration: false } }
    })
    return hadIt
  }, [setCharacter])

  /**
   * Liga/desliga o estado de Fúria (Bárbaro, PHB p.48). O consumo do uso
   * é feito separadamente via spendFeatureUse — esta ação só persiste o
   * flag visual/mecânico no combat state.
   */
  const setRageActive = useCallback(active => {
    setCharacter(prev => ({ ...prev, combat: { ...prev.combat, rageActive: !!active } }))
  }, [setCharacter])

  /**
   * Economia de ação do turno (PHB p.189-193).
   * `key` ∈ 'actionUsed' | 'bonusUsed' | 'reactionUsed' — toggle do flag.
   */
  const toggleTurnFlag = useCallback(key => {
    setCharacter(prev => {
      const turnState = prev.combat?.turnState ?? {}
      return {
        ...prev,
        combat: {
          ...prev.combat,
          turnState: { ...turnState, [key]: !turnState[key] },
        },
      }
    })
  }, [setCharacter])

  /** Marca pés de movimento gastos no turno corrente (clampa em 0). */
  const setMovementUsed = useCallback(feet => {
    setCharacter(prev => {
      const turnState = prev.combat?.turnState ?? {}
      return {
        ...prev,
        combat: {
          ...prev.combat,
          turnState: { ...turnState, movementUsed: Math.max(0, parseInt(feet, 10) || 0) },
        },
      }
    })
  }, [setCharacter])

  /** Reset completo da economia de ação (botão "↻ Turno"). */
  const resetTurn = useCallback(() => {
    setCharacter(prev => ({
      ...prev,
      combat: {
        ...prev.combat,
        turnState: { actionUsed: false, bonusUsed: false, reactionUsed: false, movementUsed: 0 },
      },
    }))
  }, [setCharacter])

  /**
   * Atualiza o estado de Forma Selvagem (Druida, PHB p.66).
   * Estrutura: { active, beastName, currentHp, maxHp }.
   * Passar null reseta o estado.
   */
  const setWildShape = useCallback(wildShape => {
    setCharacter(prev => ({
      ...prev,
      combat: { ...prev.combat, wildShape: wildShape ?? { active: false, beastName: '', currentHp: 0, maxHp: 0 } },
    }))
  }, [setCharacter])

  /**
   * Liga/desliga uma besta na lista de conhecidas do druida (PHB p.66).
   * Adiciona se ausente, remove se presente. Marcação feita pelo jogador.
   */
  const toggleKnownBeast = useCallback(beastIndex => {
    setCharacter(prev => {
      const list = prev.combat?.knownBeasts ?? []
      const next = list.includes(beastIndex)
        ? list.filter(i => i !== beastIndex)
        : [...list, beastIndex]
      return { ...prev, combat: { ...prev.combat, knownBeasts: next } }
    })
  }, [setCharacter])

  /**
   * Atualiza o estado do Companheiro Animal do Patrulheiro (Mestre das Bestas).
   * Estrutura: { name, currentHp, maxHp, ac }.
   */
  const setRangerCompanion = useCallback(companion => {
    setCharacter(prev => ({
      ...prev,
      combat: { ...prev.combat, rangerCompanion: companion ?? { name: '', currentHp: 0, maxHp: 0, ac: 13 } },
    }))
  }, [setCharacter])

  /**
   * Atualiza os dados de Portento do Mago (Adivinhação).
   * Estrutura: { dice: number[] }.
   */
  const updatePortent = useCallback(portent => {
    setCharacter(prev => ({
      ...prev,
      combat: { ...prev.combat, portent: portent ?? { dice: [] } },
    }))
  }, [setCharacter])

  /** Adiciona/substitui um efeito ativo (buff de magia). Upsert por id. */
  const addActiveEffect = useCallback((effect) => {
    setCharacter(prev => ({
      ...prev,
      combat: { ...prev.combat, activeEffects: upsertEffect(prev.combat?.activeEffects, effect) },
    }))
  }, [setCharacter])

  const removeActiveEffect = useCallback((id) => {
    setCharacter(prev => ({
      ...prev,
      combat: { ...prev.combat, activeEffects: removeEffect(prev.combat?.activeEffects, id) },
    }))
  }, [setCharacter])

  /**
   * Define a magia em concentração (PHB p.203). Passar null/''  encerra.
   * Substituição é intencional: apenas uma magia de concentração por vez.
   */
  const setConcentration = useCallback((spell) => {
    setCharacter(prev => {
      const prevIndex = prev.combat?.concentrating?.spellIndex ?? null
      const nextIndex = spell?.index ?? null
      const activeEffects = prevIndex && prevIndex !== nextIndex
        ? pruneOnConcentrationChange(prev.combat?.activeEffects, prevIndex)
        : (prev.combat?.activeEffects ?? [])
      return {
        ...prev,
        combat: {
          ...prev.combat,
          activeEffects,
          concentrating: spell
            ? { spellIndex: spell.index, spellName: spell.name }
            : { spellIndex: null, spellName: null },
        },
      }
    })
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
    togglePrepared,
    toggleSlot,
    spendSlot,
    regainSlot,
    restoreAllSlots,
    spendPactSlot,
    regainPactSlot,
    setConcentration,
    toggleLanguage,
    addAttack,
    removeAttack,
    updateAttack,
    setChosenFeature,
    setClassFeatureUses,
    spendFeatureUse,
    regainFeatureUse,
    // v4
    updateDeathSaves,
    toggleCondition,
    setInspiration,
    setExhaustion,
    setRageActive,
    setWildShape,
    toggleKnownBeast,
    setRangerCompanion,
    updatePortent,
    // Economia de ação do turno (PHB p.189)
    toggleTurnFlag,
    setMovementUsed,
    resetTurn,
    // v5 — sistema de dano/cura/testes de morte
    applyDamage,
    applyHealing,
    gainTempHp,
    stabilize,
    rollDeathSave,
    lastDamageEvent,
    clearLastDamageEvent,
    consumeInspiration,
    // v6 — efeitos ativos de magia (buffs)
    addActiveEffect,
    removeActiveEffect,
  }), [
    character, setCharacter,
    updateInfo, updateAttribute, updateCombat, updateTraits,
    toggleSkillProficiency, toggleExpertiseSkill,
    updateCurrency, addItem, removeItem, updateItem,
    updateSpellcasting, addSpell, removeSpell, togglePrepared,
    toggleSlot, spendSlot, regainSlot, restoreAllSlots,
    spendPactSlot, regainPactSlot,
    setConcentration,
    toggleLanguage,
    addAttack, removeAttack, updateAttack,
    setChosenFeature,
    setClassFeatureUses, spendFeatureUse, regainFeatureUse,
    updateDeathSaves, toggleCondition, setInspiration, setExhaustion, setRageActive, setWildShape,
    toggleKnownBeast,
    setRangerCompanion, updatePortent,
    applyDamage, applyHealing, gainTempHp, stabilize, rollDeathSave,
    lastDamageEvent, clearLastDamageEvent, consumeInspiration,
    addActiveEffect, removeActiveEffect,
  ])
}
