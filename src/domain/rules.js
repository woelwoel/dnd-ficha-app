/**
 * Camada de regras puras (D&D 5e).
 * Funções aqui recebem um `character` e retornam um `character` novo.
 * Sem React, sem fetches, sem side effects — testável em isolamento.
 */

import { getModifier, SKILLS } from '../utils/calculations'
import { keyFromName } from './attributes'
import { CASTER_TYPE } from '../utils/spellcasting'

/* ── Constantes ──────────────────────────────────────────────────── */

export const SPELLCASTER_CLASSES = new Set([
  'bardo', 'clerigo', 'druida', 'paladino',
  'patrulheiro', 'feiticeiro', 'bruxo', 'mago',
])

export const MAX_ATTRIBUTE_VALUE = 20
export const HARD_MAX_ATTRIBUTE = 30

/** Níveis em que classes ganham ASI/Feat (PHB p.165). */
export const ASI_LEVELS = [4, 8, 12, 16, 19]
/** Variantes por classe: Guerreiro (+6, +14), Ladino (+10). */
export const ASI_LEVELS_BY_CLASS = {
  guerreiro: [4, 6, 8, 12, 14, 16, 19],
  ladino:    [4, 8, 10, 12, 16, 19],
}

const PACT_FAMILIAR_SPELL = Object.freeze({
  index: 'find-familiar',
  name: 'Achar Familiar',
  level: 1,
  school: 'Conjuração',
  ritual: true,
  concentration: false,
  desc: 'Você evoca um espírito familiar que assume a forma de um animal.',
})

/* ── Helpers ─────────────────────────────────────────────────────── */

const clampAbility = (value, max = MAX_ATTRIBUTE_VALUE) =>
  Math.min(max, Math.max(1, value))

const uniqueBy = (arr, getKey) => {
  const seen = new Set()
  return arr.filter(item => {
    const k = getKey(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * Mapa classIndex → ability key de conjuração (alinhado a PREPARE_CONFIG /
 * KNOWN_CLASSES em utils/spellcasting). Mantido aqui para evitar import
 * circular nos callers de rules.js.
 */
const CLASS_SPELL_ABILITY = {
  mago:        'int',
  clerigo:     'wis',
  druida:      'wis',
  paladino:    'cha',
  patrulheiro: 'wis',
  bardo:       'cha',
  feiticeiro:  'cha',
  bruxo:       'cha',
}

const SKILL_BY_NAME = Object.fromEntries(SKILLS.map(s => [s.name, s.key]))
const skillKeyByName = name => SKILL_BY_NAME[name] ?? null

/* ── Sincronização de magias concedidas por features ─────────────── */

export function syncGrantedSpells(character) {
  const pact = character.info?.chosenFeatures?.pact_boon
  const current = character.spellcasting?.spells ?? []

  if (pact === 'corrente' && !current.some(s => s.index === 'find-familiar')) {
    return {
      ...character,
      spellcasting: {
        ...character.spellcasting,
        spells: [...current, { ...PACT_FAMILIAR_SPELL }],
      },
    }
  }
  return character
}

/* ── Pré-requisitos de multiclasse (PHB p.163) ───────────────────── */

/**
 * Avalia pré-requisitos de uma classe. O JSON pode ter formato:
 *   { "str": 13 }                    → STR ≥ 13
 *   { "str": 13, "cha": 13 }         → STR ≥ 13 E CHA ≥ 13
 *   { "str": 13, "or": "dex" }       → STR ≥ 13 OU DEX ≥ 13 (Guerreiro)
 *
 * @returns {{ ok:boolean, missing:string[] }}
 */
export function evaluateMulticlassPrerequisites(attributes = {}, reqs) {
  if (!reqs || typeof reqs !== 'object') return { ok: true, missing: [] }
  const orKey = reqs.or
  if (orKey) {
    const mainKey = Object.keys(reqs).find(k => k !== 'or')
    if (!mainKey) return { ok: true, missing: [] }
    const min = reqs[mainKey]
    const passMain = (attributes?.[mainKey] ?? 0) >= min
    const passOr   = (attributes?.[orKey]   ?? 0) >= min
    return passMain || passOr
      ? { ok: true, missing: [] }
      : { ok: false, missing: [`${mainKey.toUpperCase()} ou ${orKey.toUpperCase()} ≥ ${min}`] }
  }
  const missing = []
  for (const [key, min] of Object.entries(reqs)) {
    if (typeof min !== 'number') continue
    if ((attributes?.[key] ?? 0) < min) missing.push(`${key.toUpperCase()} ≥ ${min}`)
  }
  return { ok: missing.length === 0, missing }
}

/* ── Troca de classe ─────────────────────────────────────────────── */

/**
 * Troca a classe primária. Atualiza:
 *  - info.class
 *  - proficiencies.savingThrows (apenas a classe primária concede saves —
 *    PHB p.164)
 *  - spellcasting.ability (compat — UI antigas)
 *  - spellcasting.abilitiesByClass[novaClasse] (sem destruir as outras)
 *  - combat.hitDice.pool[dN] (preserva used)
 */
export function applyClassChange(character, classData) {
  if (!classData) return character

  const saveKeys = (classData.saving_throws ?? [])
    .map(keyFromName)
    .filter(Boolean)

  const die = classData.hit_die ?? 8
  const dieKey = `d${die}`
  const level = character.info?.level ?? 1

  const existingPool = (character.combat?.hitDice && typeof character.combat.hitDice === 'object'
    ? character.combat.hitDice.pool
    : null) ?? {}
  const nextPool = { ...existingPool, [dieKey]: { total: level, used: existingPool[dieKey]?.used ?? 0 } }

  const newClassIndex = classData.index
  const classAbility = CLASS_SPELL_ABILITY[newClassIndex]
    ?? (classData.spellcasting_ability ? keyFromName(classData.spellcasting_ability) : null)
  const prevByClass = character.spellcasting?.abilitiesByClass ?? {}
  const nextByClass = classAbility
    ? { ...prevByClass, [newClassIndex]: classAbility }
    : prevByClass

  return {
    ...character,
    info: { ...character.info, class: newClassIndex },
    proficiencies: { ...character.proficiencies, savingThrows: saveKeys },
    spellcasting: {
      ...character.spellcasting,
      ability: classAbility,                      // compat
      abilitiesByClass: nextByClass,
    },
    combat: { ...character.combat, hitDice: { pool: nextPool } },
  }
}

/* ── Troca de raça / sub-raça ────────────────────────────────────── */

/**
 * Calcula o mapa de bônus raciais.
 * Tasha's Custom Origin (`flexibleAsi`): se override informado e soma ≤ 3,
 * usa o override no lugar dos bônus do JSON.
 */
export function computeRacialBonuses(raceIndex, subraceIndex, races, { flexibleAsi = false, override = null } = {}) {
  if (flexibleAsi && override && Object.keys(override).length) {
    const sum = Object.values(override).reduce((s, v) => s + (Number(v) || 0), 0)
    if (sum <= 3) return { ...override }
  }
  const race = races?.find(r => r.index === raceIndex)
  const subrace = race?.subraces?.find(sr => sr.index === subraceIndex)
  const map = {}
  const bonuses = [
    ...(race?.ability_bonuses ?? []),
    ...(subrace?.ability_bonuses ?? []),
  ]
  for (const b of bonuses) {
    const key = keyFromName(b.ability) ?? b.ability?.toLowerCase?.()
    if (key && b.bonus) map[key] = (map[key] ?? 0) + b.bonus
  }
  return map
}

/**
 * Re-aplica bônus raciais: reverte os antigos e soma os novos.
 *
 * Estratégia "diff": só é confiável se atributos forem editados exclusivamente
 * por reducers. Edições manuais entre trocas podem causar drift; nesses casos
 * o usuário pode acionar "redefinir bônus" na UI (zera appliedRacialBonuses).
 */
export function applyRacialChange(character, infoPatch, raceIndex, subraceIndex, races) {
  const oldApplied = character.appliedRacialBonuses ?? {}
  const flexibleAsi = character.meta?.settings?.flexibleRacialAsi ?? false
  const override = character.info?.racialAsiOverride ?? null
  const newBonuses = computeRacialBonuses(raceIndex, subraceIndex, races, { flexibleAsi, override })

  const attrs = { ...character.attributes }
  for (const [k, v] of Object.entries(oldApplied)) {
    attrs[k] = clampAbility((attrs[k] ?? 10) - v)
  }
  for (const [k, v] of Object.entries(newBonuses)) {
    attrs[k] = clampAbility((attrs[k] ?? 10) + v, MAX_ATTRIBUTE_VALUE)
  }

  return {
    ...character,
    info: { ...character.info, ...infoPatch },
    attributes: attrs,
    appliedRacialBonuses: newBonuses,
  }
}

/* ── Troca de antecedente ────────────────────────────────────────── */

export function applyBackgroundChange(character, newBgIndex, backgrounds, parseEquipment, generateId) {
  const bg = backgrounds?.find(b => b.index === newBgIndex)
  const prevBg = backgrounds?.find(b => b.index === character.info.background)

  const bgSkillKeys = (bg?.skill_proficiencies ?? [])
    .map(name => ({ name, key: skillKeyByName(name) }))
    .filter(x => x.key)
    .map(x => x.key)

  const { items: bgItems, gold: bgGold } = parseEquipment(bg?.equipment) ?? { items: [], gold: 0 }
  const { gold: prevBgGold } = parseEquipment(prevBg?.equipment) ?? { gold: 0 }

  const keepItems = (character.inventory?.items ?? []).filter(i => i.source !== 'background')
  const newItems = [
    ...keepItems,
    ...bgItems.map(i => ({ ...i, id: generateId() })),
  ]

  const currentGp = character.inventory?.currency?.gp ?? 0
  const gpWithoutOldBg = Math.max(0, currentGp - prevBgGold)
  const newGp = gpWithoutOldBg + (newBgIndex ? bgGold : 0)

  return {
    ...character,
    info: { ...character.info, background: newBgIndex },
    proficiencies: {
      ...character.proficiencies,
      backgroundSkills: bgSkillKeys,
    },
    inventory: {
      ...character.inventory,
      items: newItems,
      currency: { ...character.inventory.currency, gp: newGp },
    },
  }
}

/* ── Multiclasse ─────────────────────────────────────────────────── */

/**
 * Adiciona uma nova classe ao personagem.
 *
 * VALIDA pré-requisitos do PHB p.163 quando `multiclassData` é fornecido.
 * Retorna `{ ok, character, error?, missing? }` — em caso de erro, o
 * personagem original é retornado sem modificações.
 *
 * @param {object} character
 * @param {object} params
 * @param {string} params.classIndex
 * @param {object} [params.proficiencies]
 * @param {object} [params.multiclassData] - phb-multiclass-pt.json
 * @param {object} [params.classData]      - SRD (hit_die / spellcasting_ability)
 */
export function addMulticlass(character, {
  classIndex: mcClass,
  proficiencies: mcProfs = {},
  multiclassData = null,
  classData = null,
}) {
  const allowed = character.meta?.settings?.allowMulticlass ?? true
  if (!allowed) {
    return { ok: false, character, error: 'Multiclasse desabilitado nas configurações da ficha.', missing: [] }
  }

  const reqs = multiclassData?.[mcClass]?.prerequisites
  const verdict = evaluateMulticlassPrerequisites(character.attributes, reqs)
  if (!verdict.ok) {
    return {
      ok: false, character,
      error: `Pré-requisitos para multiclasse em ${mcClass}: ${verdict.missing.join(', ')}`,
      missing: verdict.missing,
    }
  }

  const mcs = [...(character.info.multiclasses ?? []), { class: mcClass, level: 1 }]
  const prevProfs = character.proficiencies ?? {}
  const mergeUnique = (a = [], b = []) => [...new Set([...a, ...b])]

  // HD pool: adiciona dN da nova classe (level 1).
  const die = classData?.hit_die ?? 8
  const dieKey = `d${die}`
  const existingPool = (character.combat?.hitDice && typeof character.combat.hitDice === 'object'
    ? character.combat.hitDice.pool
    : null) ?? {}
  const prevTotal = existingPool[dieKey]?.total ?? 0
  const nextPool = {
    ...existingPool,
    [dieKey]: { total: prevTotal + 1, used: existingPool[dieKey]?.used ?? 0 },
  }

  // Spellcasting ability da nova classe (sem perder as anteriores).
  const ability = CLASS_SPELL_ABILITY[mcClass]
    ?? (classData?.spellcasting_ability ? keyFromName(classData.spellcasting_ability) : null)
  const prevByClass = character.spellcasting?.abilitiesByClass ?? {}
  const nextByClass = ability ? { ...prevByClass, [mcClass]: ability } : prevByClass

  return {
    ok: true,
    character: {
      ...character,
      info: { ...character.info, multiclasses: mcs },
      proficiencies: {
        ...prevProfs,
        armor:   mergeUnique(prevProfs.armor,   mcProfs.armor   ?? []),
        weapons: mergeUnique(prevProfs.weapons, mcProfs.weapons ?? []),
        tools:   mergeUnique(prevProfs.tools,   mcProfs.tools   ?? []),
      },
      combat: { ...character.combat, hitDice: { pool: nextPool } },
      spellcasting: { ...character.spellcasting, abilitiesByClass: nextByClass },
    },
  }
}

export function removeMulticlass(character, idx) {
  const list = character.info.multiclasses ?? []
  const removed = list[idx]
  const mcs = list.filter((_, i) => i !== idx)

  // Limpa ability dessa classe se não estiver mais presente.
  const stillPresent = removed && (
    character.info.class === removed.class
    || mcs.some(m => m.class === removed.class)
  )
  let abilitiesByClass = character.spellcasting?.abilitiesByClass ?? {}
  if (removed && !stillPresent) {
    const next = { ...abilitiesByClass }
    delete next[removed.class]
    abilitiesByClass = next
  }

  return {
    ...character,
    info: { ...character.info, multiclasses: mcs },
    spellcasting: { ...character.spellcasting, abilitiesByClass },
  }
}

/* ── Level-up ────────────────────────────────────────────────────── */

/**
 * Aplica o level up. Garante:
 *  - hpIncrease ≥ 1 (PHB p.15)
 *  - ASI XOR Feat (PHB p.165)
 *  - Persistência da escolha em `info.asiOrFeatByLevel`
 *  - Limite de +20 em atributos (PHB p.13)
 */
export function applyLevelUp(character, patch) {
  const {
    newLevel, hpIncrease, attrBoosts,
    multiclassIndex, newChoices, bonusSpells, chosenFeat,
  } = patch
  const allowFeats = character.meta?.settings?.allowFeats ?? false

  const hasAsi  = !!attrBoosts && Object.values(attrBoosts).some(v => Number(v) > 0)
  const hasFeat = !!chosenFeat && allowFeats

  // PHB p.165: ASI e Feat são mutuamente exclusivos. Estratégia conservadora:
  // mantém ASI, descarta Feat, e avisa em DEV. UI deve impedir antes de chegar aqui.
  if (hasAsi && hasFeat && typeof console !== 'undefined' && console.warn) {
    console.warn('[applyLevelUp] ASI e Feat são mutuamente exclusivos (PHB p.165). Mantendo ASI, descartando Feat.')
  }

  const attributes = Object.entries(attrBoosts ?? {}).reduce(
    (acc, [k, v]) => ({ ...acc, [k]: Math.min(MAX_ATTRIBUTE_VALUE, (acc[k] ?? 10) + (Number(v) || 0)) }),
    { ...character.attributes }
  )

  let info = multiclassIndex == null
    ? { ...character.info, level: newLevel }
    : {
        ...character.info,
        multiclasses: character.info.multiclasses.map((mc, i) =>
          i === multiclassIndex ? { ...mc, level: newLevel } : mc
        ),
      }

  if (newChoices && Object.keys(newChoices).length) {
    info = { ...info, chosenFeatures: { ...(info.chosenFeatures ?? {}), ...newChoices } }
  }

  if (hasAsi || (hasFeat && !hasAsi)) {
    const totalLevelAfter = (multiclassIndex == null ? newLevel : character.info.level)
      + (character.info.multiclasses ?? [])
        .reduce((s, mc, i) => s + (i === multiclassIndex ? newLevel : mc.level ?? 0), 0)
    info = {
      ...info,
      asiOrFeatByLevel: {
        ...(info.asiOrFeatByLevel ?? {}),
        [String(totalLevelAfter)]: hasAsi ? 'asi' : 'feat',
      },
    }
  }

  if (hasFeat && !hasAsi) {
    info = {
      ...info,
      feats: [...(info.feats ?? []), {
        index: chosenFeat.index,
        name:  chosenFeat.name,
        takenAtLevel: newLevel,
      }],
    }
  }

  const mergedSpells = uniqueBy(
    [...(character.spellcasting?.spells ?? []), ...(bonusSpells ?? [])],
    s => s.index
  )

  // PHB p.15: ganho mínimo de 1 HP por nível.
  const safeHpIncrease = Math.max(1, Number(hpIncrease) || 1)

  const next = {
    ...character,
    info,
    attributes,
    combat: {
      ...character.combat,
      maxHp:     (character.combat.maxHp ?? 0) + safeHpIncrease,
      currentHp: (character.combat.currentHp ?? 0) + safeHpIncrease,
    },
    spellcasting: { ...character.spellcasting, spells: mergedSpells },
  }

  return syncGrantedSpells(next)
}

/* ── HP máximo considerando multiclasse (regra PHB p.164) ────────── */

export function calculateMaxHpMulticlass(character, classDataByIndex) {
  const { info, attributes } = character
  const primary = classDataByIndex?.[info?.class]
  if (!primary) return 0

  const conMod = getModifier(attributes?.con ?? 10)
  const primaryHitDie = primary.hit_die ?? 8
  const primaryLevel = info?.level ?? 1

  let total = Math.max(1, primaryHitDie + conMod)
  const avg = die => Math.max(1, Math.floor(die / 2) + 1 + conMod)

  for (let l = 2; l <= primaryLevel; l++) total += avg(primaryHitDie)

  for (const mc of info?.multiclasses ?? []) {
    const mcData = classDataByIndex?.[mc.class]
    const die = mcData?.hit_die ?? 8
    for (let l = 1; l <= (mc.level ?? 0); l++) total += avg(die)
  }

  return Math.max(1, total)
}

/* ── Class Features Uses ─────────────────────────────────────────── */

/**
 * Calcula o pool padrão de usos de class features para o personagem.
 *
 * Cobertura (PHB cap. 3):
 *  - Guerreiro : Action Surge (1 lvl 2; 2 lvl 17), Second Wind (1, short)
 *  - Monge     : Ki Points (= nível, short)
 *  - Bárbaro   : Rage (escala por nível, long; ilimitado lvl 20)
 *  - Bardo     : Bardic Inspiration (max(1, CHA mod), short ≥5 / long <5)
 *  - Clérigo   : Channel Divinity (1/2/3, short)
 *  - Paladino  : Channel Divinity (1, short); Lay on Hands (5×nivel, long)
 *  - Druida    : Wild Shape (2, short; ilimitado lvl 20)
 *  - Feiticeiro: Sorcery Points (= nível, long)
 *
 * Bruxo: Pact slots tratados em `spellcasting.pactSlotsUsed`.
 *
 * Retorna array NORMALIZADO (id estável). Use `mergeFeatureUses` para
 * preservar `used` ao subir de nível.
 */
export function defaultClassFeatureUses(character) {
  const out = []
  const cha = getModifier(character.attributes?.cha ?? 10)

  const classes = [
    { class: character.info?.class, level: character.info?.level ?? 0 },
    ...(character.info?.multiclasses ?? []),
  ]

  for (const { class: cls, level } of classes) {
    if (!cls || !level) continue

    if (cls === 'guerreiro') {
      const actionSurges = level >= 17 ? 2 : level >= 2 ? 1 : 0
      if (actionSurges > 0) {
        out.push({ id: 'guerreiro-action-surge', name: 'Surto de Ação', max: actionSurges, used: 0, recharge: 'short', source: 'guerreiro' })
      }
      out.push({ id: 'guerreiro-second-wind', name: 'Retomar o Fôlego', max: 1, used: 0, recharge: 'short', source: 'guerreiro' })
    }
    if (cls === 'monge' && level >= 2) {
      out.push({ id: 'monge-ki', name: 'Ki', max: level, used: 0, recharge: 'short', source: 'monge' })
    }
    if (cls === 'barbaro' && level >= 1 && level < 20) {
      const rages = level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2
      out.push({ id: 'barbaro-rage', name: 'Fúria', max: rages, used: 0, recharge: 'long', source: 'barbaro' })
    }
    if (cls === 'bardo' && level >= 1) {
      out.push({
        id: 'bardo-bardic-inspiration',
        name: 'Inspiração de Bardo',
        max: Math.max(1, cha),
        used: 0,
        recharge: level >= 5 ? 'short' : 'long',
        source: 'bardo',
      })
    }
    if (cls === 'clerigo' && level >= 2) {
      const cd = level >= 18 ? 3 : level >= 6 ? 2 : 1
      out.push({ id: 'clerigo-channel-divinity', name: 'Canalizar Divindade', max: cd, used: 0, recharge: 'short', source: 'clerigo' })
    }
    if (cls === 'paladino' && level >= 3) {
      out.push({ id: 'paladino-channel-divinity', name: 'Canalizar Divindade', max: 1, used: 0, recharge: 'short', source: 'paladino' })
    }
    if (cls === 'paladino' && level >= 1) {
      out.push({ id: 'paladino-lay-on-hands', name: 'Imposição das Mãos', max: 5 * level, used: 0, recharge: 'long', source: 'paladino' })
    }
    if (cls === 'druida' && level >= 2 && level < 20) {
      out.push({ id: 'druida-wild-shape', name: 'Forma Selvagem', max: 2, used: 0, recharge: 'short', source: 'druida' })
    }
    if (cls === 'feiticeiro' && level >= 2) {
      out.push({ id: 'feiticeiro-sorcery-points', name: 'Pontos de Feitiçaria', max: level, used: 0, recharge: 'long', source: 'feiticeiro' })
    }
  }

  return out
}

/** Mescla um pool default com o existente, preservando `used` por id. */
export function mergeFeatureUses(existing = [], next = []) {
  const usedById = Object.fromEntries(existing.map(e => [e.id, e.used ?? 0]))
  return next.map(n => ({ ...n, used: Math.min(n.max, usedById[n.id] ?? 0) }))
}

/**
 * Recalcula e mescla o pool de class features do personagem.
 * Útil após level up ou troca de atributos.
 */
export function syncClassFeatureUses(character) {
  const next = defaultClassFeatureUses(character)
  const merged = mergeFeatureUses(character.combat?.classFeatureUses ?? [], next)
  return {
    ...character,
    combat: { ...character.combat, classFeatureUses: merged },
  }
}

/* ── Concentração ────────────────────────────────────────────────── */

/**
 * Define ou limpa a magia em concentração. PHB p.203: apenas UMA por vez.
 */
export function setConcentration(character, spell) {
  return {
    ...character,
    combat: {
      ...character.combat,
      concentrating: spell
        ? { spellIndex: spell.index, spellName: spell.name }
        : { spellIndex: null, spellName: null },
    },
  }
}

/**
 * PHB p.203: ao receber dano em concentração, save CON DC = max(10, ⌊dmg/2⌋).
 * Caller passa o resultado do save; aqui retornamos o character limpo se falhou.
 */
export function applyConcentrationCheck(character, { saveSucceeded }) {
  if (saveSucceeded) return character
  return setConcentration(character, null)
}

/* ── Lookup utilitário ───────────────────────────────────────────── */

/**
 * Lista os classIndex conjuradores ativos no personagem (full/half/pact).
 * Útil para UIs que iteram abilities por classe.
 */
export function listSpellcastingClasses(character) {
  const all = [character.info?.class, ...((character.info?.multiclasses ?? []).map(m => m.class))]
  const out = []
  for (const c of all) {
    if (!c) continue
    if (CASTER_TYPE[c] || c === 'bruxo') out.push(c)
  }
  return [...new Set(out)]
}
