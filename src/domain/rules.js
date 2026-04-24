/**
 * Camada de regras puras (D&D 5e).
 * Funções aqui recebem um `character` e retornam um `character` novo.
 * Sem React, sem fetches, sem side effects — testável em isolamento.
 */

import { getModifier } from '../utils/calculations'
import { keyFromName } from './attributes'

/* ── Constantes ──────────────────────────────────────────────────── */

export const SPELLCASTER_CLASSES = new Set([
  'bardo', 'clerigo', 'druida', 'paladino',
  'patrulheiro', 'feiticeiro', 'bruxo', 'mago',
])

export const MAX_ATTRIBUTE_VALUE = 20
export const HARD_MAX_ATTRIBUTE = 30

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

/* ── Troca de classe ─────────────────────────────────────────────── */

export function applyClassChange(character, classData) {
  if (!classData) return character

  const saveKeys = (classData.saving_throws ?? [])
    .map(keyFromName)
    .filter(Boolean)

  const spellKey = classData.spellcasting_ability
    ? keyFromName(classData.spellcasting_ability)
    : null

  const die = classData.hit_die ?? 8
  const dieKey = `d${die}`
  const level = character.info?.level ?? 1
  // Schema v2: `hitDice` é objeto com pool por tipo de dado. Regenera o pool
  // da classe primária, preservando outros dados (multiclasse) se existirem.
  const existingPool = (character.combat?.hitDice && typeof character.combat.hitDice === 'object'
    ? character.combat.hitDice.pool
    : null) ?? {}
  const nextPool = { ...existingPool, [dieKey]: { total: level, used: existingPool[dieKey]?.used ?? 0 } }

  return {
    ...character,
    info: { ...character.info, class: classData.index },
    proficiencies: { ...character.proficiencies, savingThrows: saveKeys },
    spellcasting: { ...character.spellcasting, ability: spellKey },
    combat: { ...character.combat, hitDice: { pool: nextPool } },
  }
}

/* ── Troca de raça / sub-raça ────────────────────────────────────── */

/**
 * Calcula o mapa de bônus raciais a partir dos dados SRD.
 * Retorna objeto { str: N, dex: N, ... } apenas com chaves não-zero.
 */
export function computeRacialBonuses(raceIndex, subraceIndex, races) {
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
 * Mantém `appliedRacialBonuses` como fonte de verdade dos ajustes atuais.
 */
export function applyRacialChange(character, infoPatch, raceIndex, subraceIndex, races) {
  const oldApplied = character.appliedRacialBonuses ?? {}
  const newBonuses = computeRacialBonuses(raceIndex, subraceIndex, races)
  const attrs = { ...character.attributes }

  for (const [k, v] of Object.entries(oldApplied)) {
    attrs[k] = clampAbility((attrs[k] ?? 10) - v)
  }
  for (const [k, v] of Object.entries(newBonuses)) {
    // Durante criação o teto é 20 (PHB p.13 "Ability Score Maximum").
    // HARD_MAX_ATTRIBUTE (30) só se aplica a efeitos in-game.
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

// Lookup interno: nome PT-BR da perícia → chave. Depende de SKILLS em calculations.
import { SKILLS } from '../utils/calculations'
const SKILL_BY_NAME = Object.fromEntries(SKILLS.map(s => [s.name, s.key]))
const skillKeyByName = name => SKILL_BY_NAME[name] ?? null

/* ── Multiclasse ─────────────────────────────────────────────────── */

export function addMulticlass(character, { classIndex: mcClass, proficiencies: mcProfs = {} }) {
  const allowed = character.meta?.settings?.allowMulticlass ?? true
  if (!allowed) return character

  const mcs = [...(character.info.multiclasses ?? []), { class: mcClass, level: 1 }]
  const prevProfs = character.proficiencies ?? {}

  const mergeUnique = (a = [], b = []) => [...new Set([...a, ...b])]

  return {
    ...character,
    info: { ...character.info, multiclasses: mcs },
    proficiencies: {
      ...prevProfs,
      armor:   mergeUnique(prevProfs.armor,   mcProfs.armor   ?? []),
      weapons: mergeUnique(prevProfs.weapons, mcProfs.weapons ?? []),
      tools:   mergeUnique(prevProfs.tools,   mcProfs.tools   ?? []),
    },
  }
}

export function removeMulticlass(character, idx) {
  const mcs = (character.info.multiclasses ?? []).filter((_, i) => i !== idx)
  return { ...character, info: { ...character.info, multiclasses: mcs } }
}

/* ── Level-up ────────────────────────────────────────────────────── */

export function applyLevelUp(character, patch) {
  const {
    newLevel, hpIncrease, attrBoosts,
    multiclassIndex, newChoices, bonusSpells, chosenFeat,
  } = patch
  const allowFeats = character.meta?.settings?.allowFeats ?? false

  // Atributos
  const attributes = Object.entries(attrBoosts ?? {}).reduce(
    (acc, [k, v]) => ({ ...acc, [k]: Math.min(MAX_ATTRIBUTE_VALUE, (acc[k] ?? 10) + v) }),
    character.attributes
  )

  // Nível (primário ou MC)
  let info = multiclassIndex == null
    ? { ...character.info, level: newLevel }
    : {
        ...character.info,
        multiclasses: character.info.multiclasses.map((mc, i) =>
          i === multiclassIndex ? { ...mc, level: newLevel } : mc
        ),
      }

  // Choices
  if (newChoices && Object.keys(newChoices).length) {
    info = { ...info, chosenFeatures: { ...(info.chosenFeatures ?? {}), ...newChoices } }
  }

  // Talento
  if (chosenFeat && allowFeats) {
    info = {
      ...info,
      feats: [...(info.feats ?? []), { index: chosenFeat.index, name: chosenFeat.name }],
    }
  }

  // Magias bônus (cantrips do Pacto do Tomo etc.)
  const mergedSpells = uniqueBy(
    [...(character.spellcasting?.spells ?? []), ...(bonusSpells ?? [])],
    s => s.index
  )

  const next = {
    ...character,
    info,
    attributes,
    combat: {
      ...character.combat,
      maxHp:     character.combat.maxHp + hpIncrease,
      currentHp: character.combat.currentHp + hpIncrease,
    },
    spellcasting: { ...character.spellcasting, spells: mergedSpells },
  }

  return syncGrantedSpells(next)
}

/* ── HP máximo considerando multiclasse (regra PHB p.164) ────────── */

/**
 * Nível 1 da classe primária = hitDie + CON.
 * Demais níveis (primários ou de multiclasse) = avg + CON cada.
 */
export function calculateMaxHpMulticlass(character, classDataByIndex) {
  const { info, attributes } = character
  const primary = classDataByIndex?.[info?.class]
  if (!primary) return 0

  const conMod = getModifier(attributes?.con ?? 10)
  const primaryHitDie = primary.hit_die ?? 8
  const primaryLevel = info?.level ?? 1

  let total = primaryHitDie + conMod
  const avg = die => Math.max(1, Math.floor(die / 2) + 1 + conMod)

  for (let l = 2; l <= primaryLevel; l++) total += avg(primaryHitDie)

  for (const mc of info?.multiclasses ?? []) {
    const mcData = classDataByIndex?.[mc.class]
    const die = mcData?.hit_die ?? 8
    for (let l = 1; l <= (mc.level ?? 0); l++) total += avg(die)
  }

  return Math.max(1, total)
}
