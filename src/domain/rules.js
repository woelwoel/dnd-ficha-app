/**
 * Camada de regras puras (D&D 5e).
 * Funções aqui recebem um `character` e retornam um `character` novo.
 * Sem React, sem fetches, sem side effects — testável em isolamento.
 */

import { getModifier, SKILLS, calculateMaxHpFromHitDice, racialHpPerLevel } from '../utils/calculations'
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
 * Avalia pré-requisitos de uma classe (PHB p.163). Suporta:
 *
 *   AND (todas as chaves numéricas devem passar):
 *     { "str": 13 }                       → STR ≥ 13
 *     { "str": 13, "cha": 13 }            → STR ≥ 13 E CHA ≥ 13 (Paladino)
 *     { "dex": 13, "wis": 13 }            → DEX ≥ 13 E WIS ≥ 13 (Monge/Patrulheiro)
 *
 *   OR (qualquer uma das chaves numéricas + a chave `or` deve passar):
 *     { "str": 13, "or": "dex" }          → STR ≥ 13 OU DEX ≥ 13 (Guerreiro)
 *     { "str": 13, "or": ["dex","cha"] }  → STR ≥ 13 OU DEX ≥ 13 OU CHA ≥ 13
 *
 * Para o caso OR, o min usado para a(s) chave(s) em `or` é o min da PRIMEIRA
 * chave numérica encontrada (PHB usa 13 uniformemente, então é seguro).
 *
 * @returns {{ ok:boolean, missing:string[] }}
 */
export function evaluateMulticlassPrerequisites(attributes = {}, reqs) {
  if (!reqs || typeof reqs !== 'object') return { ok: true, missing: [] }

  // Coleta apenas pares numéricos (ignora `or` e qualquer chave não-numérica).
  const numericEntries = Object.entries(reqs).filter(
    ([k, v]) => k !== 'or' && typeof v === 'number'
  )

  // OR mode: gera lista de alternativas (chaves numéricas + chave(s) `or`).
  if (reqs.or !== undefined && reqs.or !== null) {
    if (numericEntries.length === 0) return { ok: true, missing: [] }
    const baseMin = numericEntries[0][1]
    const orKeys = Array.isArray(reqs.or) ? reqs.or : [reqs.or]
    const alternatives = [
      ...numericEntries.map(([k, v]) => ({ key: k, min: v })),
      ...orKeys.filter(k => typeof k === 'string').map(k => ({ key: k, min: baseMin })),
    ]
    const passed = alternatives.some(a => (attributes?.[a.key] ?? 0) >= a.min)
    if (passed) return { ok: true, missing: [] }
    const label = alternatives.map(a => `${a.key.toUpperCase()} ≥ ${a.min}`).join(' ou ')
    return { ok: false, missing: [label] }
  }

  // AND mode: todas as chaves numéricas devem passar.
  const missing = []
  for (const [key, min] of numericEntries) {
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
 *  - combat.hitDice.pool — RECONSTRUÍDO a partir das classes atuais (nova
 *    primária + multiclasses), preservando `used` por tipo de dado. Sem isso,
 *    o pool antigo vazava (Mago 5 d6 → vira Guerreiro = {d6:5, d10:5} = 10 HD
 *    num personagem de nível 5).
 *
 * @param {object} character
 * @param {object} classData - SRD da NOVA classe primária (hit_die, saves…)
 * @param {object} [classDataByIndex] - mapa classIndex → SRD, p/ os hit_die
 *                 das multiclasses. Sem ele, multiclasses caem em d8.
 */
export function applyClassChange(character, classData, classDataByIndex = {}) {
  if (!classData) return character

  const saveKeys = (classData.saving_throws ?? [])
    .map(keyFromName)
    .filter(Boolean)

  const level = character.info?.level ?? 1

  const existingPool = (character.combat?.hitDice && typeof character.combat.hitDice === 'object'
    ? character.combat.hitDice.pool
    : null) ?? {}

  // Reconstrói o pool do zero a partir das classes ATUAIS, agregando níveis
  // por tipo de dado e preservando `used` (clampado ao novo total).
  const totalsByDie = {}
  const addDie = (hitDie, levels) => {
    const k = `d${hitDie ?? 8}`
    totalsByDie[k] = (totalsByDie[k] ?? 0) + (levels ?? 0)
  }
  addDie(classData.hit_die, level)
  for (const mc of character.info?.multiclasses ?? []) {
    addDie(classDataByIndex?.[mc.class]?.hit_die, mc.level)
  }
  const nextPool = {}
  for (const [k, total] of Object.entries(totalsByDie)) {
    nextPool[k] = { total, used: Math.min(total, existingPool[k]?.used ?? 0) }
  }

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
  chosenSkills: mcSkills = [],
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
        // Perícia(s) escolhida(s) ao multiclassar (Bardo/Ladino/Patrulheiro
        // — PHB p.164). Dedupe contra as perícias já proficientes.
        skills:  mergeUnique(prevProfs.skills,  mcSkills ?? []),
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
/* ── Magias de domínio do Clérigo (PHB p.57–65) ──────────────────────
 * Cada domínio tem 5 pares de magias (tier 0–4), concedidos nos
 * níveis de clérigo 1, 3, 5, 7 e 9 respectivamente.
 */
const CLERIC_DOMAIN_SPELLS = {
  conhecimento: [
    ['identificar',    'comando'],       // nível 1
    ['augurio',        'sugestao'],      // nível 3
    ['nao-detectar',   'adivinhacao'],   // nível 5
    ['olho-arcano',    'confusao'],      // nível 7
    ['lenda',          'escrutinio'],    // nível 9
  ],
  vida: [
    ['bencao',                   'curar-ferimentos'],
    ['restauracao-menor',        'arma-espiritual'],
    ['farol-de-esperanca',       'oracao-curativa'],
    ['sentinela-da-morte',       'guardiao-da-fe'],
    ['curar-ferimentos-em-massa','ressuscitar'],
  ],
  luz: [
    ['maos-flamejantes', 'fogo-das-fadas'],
    ['esfera-flamejante','raio-guiador'],
    ['bola-de-fogo',     'luz-do-dia'],
    ['guardiao-da-fe',   'parede-de-fogo'],
    ['chama-radiante',   'escrutinio'],
  ],
  natureza: [
    ['amizade-animal',        'falar-com-animais'],
    ['pele-de-arvore',        'crescer-espinhos'],
    ['crescimento-de-planta', 'barreira-de-vento'],
    ['dominar-besta',         'videira-agarradora'],
    ['praga-de-insetos',      'parede-de-pedra'],
  ],
  tempestade: [
    ['nebulina',          'onda-trovejante'],
    ['lufada-de-vento',   'destruicao-trovejante'],
    ['chamada-do-relampago','tempestade-de-neve'],
    ['controlar-agua',    'tempestade-de-gelo'],
    ['onda-devastadora',  'praga-de-insetos'],
  ],
  enganacao: [
    ['encanto-pessoal',  'auto-disfarce'],
    ['imagem-espelhada', 'passar-sem-rastro'],
    ['dissipar-magia',   'nebulina'],
    ['porta-dimensional','polimorfismo'],
    ['dominar-pessoa',   'modificar-memoria'],
  ],
  guerra: [
    ['favor-divino',          'escudo-da-fe'],
    ['arma-magica',           'arma-espiritual'],
    ['manto-de-cruzado',      'guardioes-espirituais'],
    ['liberdade-de-movimento','pele-de-pedra'],
    ['chama-radiante',        'segurar-monstro'],
  ],
}

const CLERIC_DOMAIN_LEVELS = [1, 3, 5, 7, 9]

/**
 * Retorna os índices das magias de domínio para um domínio e nível de clérigo.
 * Retorna [] se o nível não for um nível de domínio (1,3,5,7,9) ou domínio desconhecido.
 */
export function getClericDomainSpellIndices(domain, clericLevel) {
  const tier = CLERIC_DOMAIN_LEVELS.indexOf(clericLevel)
  if (tier < 0) return []
  return CLERIC_DOMAIN_SPELLS[domain]?.[tier] ?? []
}

/* Proficiências de armadura concedidas por talentos específicos */
const FEAT_ARMOR_PROFICIENCIES = {
  'protecao-leve':    ['leve'],
  'protecao-moderada': ['media', 'escudos'],
  'protecao-pesada':  ['pesada'],
}

export function applyLevelUp(character, patch) {
  const {
    newLevel, hpIncrease, attrBoosts,
    multiclassIndex, newChoices, bonusSpells, chosenFeat,
    featChosenAttr,
  } = patch
  const allowFeats = character.meta?.settings?.allowFeats ?? false

  const hasAsi  = !!attrBoosts && Object.values(attrBoosts).some(v => Number(v) > 0)
  const hasFeat = !!chosenFeat && allowFeats

  // PHB p.165: ASI e Feat são mutuamente exclusivos. Estratégia conservadora:
  // mantém ASI, descarta Feat, e avisa em DEV. UI deve impedir antes de chegar aqui.
  if (hasAsi && hasFeat && typeof console !== 'undefined' && console.warn) {
    console.warn('[applyLevelUp] ASI e Feat são mutuamente exclusivos (PHB p.165). Mantendo ASI, descartando Feat.')
  }

  let attributes = Object.entries(attrBoosts ?? {}).reduce(
    (acc, [k, v]) => ({ ...acc, [k]: Math.min(MAX_ATTRIBUTE_VALUE, (acc[k] ?? 10) + (Number(v) || 0)) }),
    { ...character.attributes }
  )

  // Aplica bônus de atributo do talento (attrBonus) imediatamente aos atributos
  if (hasFeat && !hasAsi && chosenFeat.attrBonus) {
    const targetAttr = featChosenAttr ?? chosenFeat.attrBonus.choices[0]
    if (targetAttr) {
      attributes = {
        ...attributes,
        [targetAttr]: Math.min(MAX_ATTRIBUTE_VALUE, (attributes[targetAttr] ?? 10) + (chosenFeat.attrBonus.amount ?? 1)),
      }
    }
  }

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
    // PHB p.165: ASI/Feat é por nível de CLASSE, não nível total de personagem.
    // Chave: "classIndex:classLevel" — evita colisão em multiclasse quando
    // dois ASIs caem no mesmo nível total combinado.
    const targetClass = multiclassIndex == null
      ? character.info.class
      : character.info.multiclasses?.[multiclassIndex]?.class
    const key = `${targetClass ?? 'unknown'}:${newLevel}`
    info = {
      ...info,
      asiOrFeatByLevel: {
        ...(info.asiOrFeatByLevel ?? {}),
        [key]: hasAsi ? 'asi' : 'feat',
      },
    }
  }

  if (hasFeat && !hasAsi) {
    info = {
      ...info,
      feats: [...(info.feats ?? []), {
        index:       chosenFeat.index,
        name:        chosenFeat.name,
        takenAtLevel: newLevel,
        ...(chosenFeat.attrBonus ? { chosenAttr: featChosenAttr ?? chosenFeat.attrBonus.choices[0] ?? null } : {}),
      }],
    }
  }

  // Proficiências de armadura concedidas pelo talento
  let proficiencies = character.proficiencies
  if (hasFeat && !hasAsi) {
    const grantedArmor = FEAT_ARMOR_PROFICIENCIES[chosenFeat.index] ?? []
    if (grantedArmor.length > 0) {
      const currentArmor = proficiencies?.armor ?? []
      const merged = [...new Set([...currentArmor, ...grantedArmor])]
      proficiencies = { ...proficiencies, armor: merged }
    }
  }

  // Especialização: choices de expertise aplicam-se a expertiseSkills (PHB p.96, p.117)
  const EXPERTISE_CHOICE_IDS = ['expertise_skills', 'expertise_skills_2', 'expertise_bard']
  let expertiseSkills = [...(character.proficiencies?.expertiseSkills ?? [])]
  for (const id of EXPERTISE_CHOICE_IDS) {
    const val = newChoices?.[id]
    if (val) {
      const chosen = String(val).split(',').filter(Boolean)
      expertiseSkills = [...new Set([...expertiseSkills, ...chosen])]
    }
  }
  if (expertiseSkills.length > 0) {
    proficiencies = { ...proficiencies, expertiseSkills }
  }

  const mergedSpells = uniqueBy(
    [...(character.spellcasting?.spells ?? []), ...(bonusSpells ?? [])],
    s => s.index
  )

  // Talento Robusto: +2 PV por nível ao ser adquirido (PHB p.170)
  const isRobusto = hasFeat && !hasAsi && chosenFeat.index === 'robusto'
  const totalLevelForRobusto = (multiclassIndex == null ? newLevel : character.info.level)
    + (character.info.multiclasses ?? []).reduce((s, mc, i) => s + (i === multiclassIndex ? newLevel : mc.level ?? 0), 0)
  const robustoBonusHp = isRobusto ? 2 * totalLevelForRobusto : 0

  const safeHpIncrease = Math.max(1, Number(hpIncrease) || 1)

  const next = {
    ...character,
    info,
    attributes,
    proficiencies,
    combat: {
      ...character.combat,
      maxHp:     (character.combat.maxHp ?? 0) + safeHpIncrease + robustoBonusHp,
      currentHp: (character.combat.currentHp ?? 0) + safeHpIncrease + robustoBonusHp,
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

  const primaryLevel = info?.level ?? 1
  const multiclasses = info?.multiclasses ?? []

  // Talento Robusto: +2 PV por nível total (PHB p.170)
  const hasRobusto = (info?.feats ?? []).some(f => f.index === 'robusto')
  const totalLevel = primaryLevel + multiclasses.reduce((s, mc) => s + (mc.level ?? 0), 0)

  return calculateMaxHpFromHitDice({
    primaryDie: primary.hit_die ?? 8,
    primaryLevel,
    extras: multiclasses.map(mc => ({
      die: classDataByIndex?.[mc.class]?.hit_die ?? 8,
      level: mc.level ?? 0,
    })),
    conScore: attributes?.con ?? 10,
    robustoLevels: hasRobusto ? totalLevel : 0,
    racialHpPerLevel: racialHpPerLevel(info?.subrace),
  })
}

/* ── Nível por classe e salvaguardas efetivas ────────────────────── */

/** Nível total numa classe específica (primária + multiclasses). */
export function classLevel(character, classIndex) {
  const info = character?.info ?? {}
  return (info.class === classIndex ? (info.level ?? 0) : 0)
    + (info.multiclasses ?? [])
      .filter(m => m.class === classIndex)
      .reduce((s, m) => s + (m.level ?? 0), 0)
}

const ALL_SAVE_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']

/**
 * Proficiências de salvaguarda EFETIVAS do personagem.
 * Inclui Alma de Diamante do Monge (nível 14+, PHB p.79): proficiência em
 * TODOS os testes de resistência.
 */
export function getEffectiveSaveProficiencies(character) {
  if (classLevel(character, 'monge') >= 14) return [...ALL_SAVE_KEYS]
  return [...(character?.proficiencies?.savingThrows ?? [])]
}

/* ── Deslocamento (em METROS) ────────────────────────────────────── */

/**
 * Bônus de deslocamento concedido por classe, em metros (PHB).
 *  - Bárbaro: Movimento Rápido (nv 5+, sem armadura pesada) = +3m.
 *  - Monge: Movimento sem Armadura (escala por nível, sem armadura/escudo).
 */
export function classSpeedBonusMeters(character) {
  let bonus = 0
  if (classLevel(character, 'barbaro') >= 5) bonus += 3
  const mk = classLevel(character, 'monge')
  if (mk >= 18) bonus += 9
  else if (mk >= 14) bonus += 7.5
  else if (mk >= 10) bonus += 6
  else if (mk >= 6) bonus += 4.5
  else if (mk >= 2) bonus += 3
  return bonus
}

/**
 * Deslocamento base do personagem em METROS = base racial + bônus de classe.
 * @param {object} character
 * @param {number} raceSpeed - deslocamento base da raça (metros; padrão 9)
 */
export function baseSpeedMeters(character, raceSpeed) {
  return (raceSpeed ?? 9) + classSpeedBonusMeters(character)
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

  // Cada entrada carrega seu PRÓPRIO chosenFeatures. Antes lia-se
  // `character.info?.chosenFeatures` direto, o que só refletia escolhas
  // do primário — bugs reais aconteciam quando jogador tinha Clérigo MC
  // com Domínio da Guerra (sem Ataque Bélico Bônus), Druida MC com
  // Círculo da Terra (sem Recuperação Natural), Guerreiro MC Mestre de
  // Combate (sem Dado de Superioridade). Multiclasses agora têm
  // `chosenFeatures` por entrada (vide build-character.js).
  const classes = [
    {
      class: character.info?.class,
      level: character.info?.level ?? 0,
      chosen: character.info?.chosenFeatures ?? {},
    },
    ...(character.info?.multiclasses ?? []).map(mc => ({
      class: mc.class,
      level: mc.level,
      chosen: mc.chosenFeatures ?? {},
    })),
  ]

  for (const { class: cls, level, chosen } of classes) {
    if (!cls || !level) continue

    if (cls === 'guerreiro') {
      const actionSurges = level >= 17 ? 2 : level >= 2 ? 1 : 0
      if (actionSurges > 0) {
        out.push({ id: 'guerreiro-action-surge', name: 'Surto de Ação', max: actionSurges, used: 0, recharge: 'short', source: 'guerreiro' })
      }
      out.push({ id: 'guerreiro-second-wind', name: 'Retomar o Fôlego', max: 1, used: 0, recharge: 'short', source: 'guerreiro' })

      // Mestre de Combate: Dado de Superioridade (4→5→6, d8→d10→d12). PHB p.73.
      const isMestreCombate = chosen.martial_archetype === 'mestre_combate'
      if (isMestreCombate && level >= 3) {
        const dice = level >= 15 ? 6 : level >= 7 ? 5 : 4
        const dieType = level >= 18 ? 'd12' : level >= 10 ? 'd10' : 'd8'
        out.push({
          id: 'guerreiro-superiority-dice',
          name: `Dado de Superioridade (${dieType})`,
          max: dice,
          used: 0,
          recharge: 'short',
          source: 'guerreiro',
        })
      }
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
    // Círculo da Terra (PHB p.69): Recuperação Natural (nv 2+) + Refúgio da Natureza (nv 14+).
    if (cls === 'druida' && chosen.druid_circle === 'terra') {
      if (level >= 2) {
        out.push({ id: 'druida-natural-recovery', name: 'Recuperação Natural', max: 1, used: 0, recharge: 'long', source: 'druida' })
      }
      if (level >= 14) {
        out.push({ id: 'druida-natures-sanctuary', name: 'Refúgio da Natureza', max: 1, used: 0, recharge: 'long', source: 'druida' })
      }
    }
    if (cls === 'feiticeiro' && level >= 2) {
      out.push({ id: 'feiticeiro-sorcery-points', name: 'Pontos de Feitiçaria', max: level, used: 0, recharge: 'long', source: 'feiticeiro' })
    }
    // Mago — Recuperação Arcana (PHB p.115, nv 1+).
    if (cls === 'mago' && level >= 1) {
      out.push({ id: 'mago-arcane-recovery', name: 'Recuperação Arcana', max: 1, used: 0, recharge: 'long', source: 'mago' })
    }
    // Clérigo — Domínios específicos (PHB p.60+):
    if (cls === 'clerigo') {
      const domain = chosen.divine_domain
      // Domínio da Guerra (PHB p.63): Ataque Bélico Bônus 1+CHA mod /desc curto.
      if (domain === 'guerra' && level >= 1) {
        out.push({
          id: 'clerigo-war-priest', name: 'Ataque Bélico Bônus',
          max: Math.max(1, cha), used: 0, recharge: 'short', source: 'clerigo',
        })
      }
      // Domínio da Tempestade (PHB p.62): Investida Furiosa CHA mod /desc longo.
      if (domain === 'tempestade' && level >= 1) {
        out.push({
          id: 'clerigo-wrath-of-storm', name: 'Investida Furiosa',
          max: Math.max(1, cha), used: 0, recharge: 'long', source: 'clerigo',
        })
      }
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

/* ── Dano, Cura, Testes de Morte ──────────────────────────────────────
 * Camada pura RAW PHB p.197-198 + p.203 (concentração).
 * Todas as funções retornam { character, ... } — sem mutar input.
 * O caller (hook/UI) decide o que fazer com `sideEffects`:
 *  - droppedTo0: personagem caiu pra 0 HP, agora faz testes de morte
 *  - instakill: dano massivo (PHB p.197) → morte instantânea
 *  - revived: estava a 0 HP e foi curado → testes de morte zerados
 *  - died: 3 falhas acumuladas
 *  - stabilized: 3 sucessos ou cura → estável
 *  - concentrationCheckDC: dano em personagem concentrando → save CON DC
 *  - deathSaveFailuresApplied: falhas auto-aplicadas por dano a 0 HP
 */

function clampHp(value, max) {
  return Math.max(0, Math.min(max, value))
}

function emptyDeathSaves() {
  return { successes: 0, failures: 0 }
}

/**
 * Aplica dano. Drena tempHp primeiro, depois currentHp. Detecta massive damage,
 * golpe em personagem a 0 HP (+1 falha, +2 se crit), morte instantânea.
 * NÃO aplica concentration check automaticamente — só sinaliza o DC.
 */
export function applyDamage(character, amount, opts = {}) {
  const { critical = false } = opts
  const dmg = Math.max(0, Math.floor(Number(amount) || 0))
  const sideEffects = {
    damageDealt: dmg,
    droppedTo0: false,
    instakill: false,
    died: false,
    deathSaveFailuresApplied: 0,
    concentrationCheckDC: null,
  }
  if (dmg === 0) return { character, sideEffects }

  const combat = character.combat ?? {}
  const maxHp     = combat.maxHp ?? 0
  const curHp     = combat.currentHp ?? 0
  const tempHp    = combat.tempHp ?? 0
  const wasAt0    = curHp === 0
  const wasDead   = !!combat.isDead

  if (wasDead) return { character, sideEffects } // Mortos não recebem mais dano.

  // Concentração: gera DC para o caller (não auto-falha).
  if (combat.concentrating?.spellIndex) {
    sideEffects.concentrationCheckDC = Math.max(10, Math.floor(dmg / 2))
  }

  let nextTemp = tempHp
  let nextHp   = curHp
  let nextDeathSaves = combat.deathSaves ?? emptyDeathSaves()
  let nextIsStable   = !!combat.isStable
  let nextIsDead     = false

  if (wasAt0) {
    // Já estava a 0 HP: dano causa falha(s) automática(s).
    const fails = critical ? 2 : 1
    sideEffects.deathSaveFailuresApplied = fails
    nextDeathSaves = {
      successes: nextDeathSaves.successes ?? 0,
      failures: Math.min(3, (nextDeathSaves.failures ?? 0) + fails),
    }
    nextIsStable = false // dano remove estabilização (PHB p.197).
    // Dano >= maxHp em personagem a 0 HP = morte instantânea (PHB p.197).
    if (dmg >= maxHp && maxHp > 0) {
      sideEffects.instakill = true
      nextIsDead = true
      nextDeathSaves = { successes: 0, failures: 3 }
    }
    if (nextDeathSaves.failures >= 3) {
      sideEffects.died = true
      nextIsDead = true
    }
  } else {
    // Tempo HP absorve primeiro (PHB p.198).
    if (nextTemp > 0) {
      const absorbed = Math.min(nextTemp, dmg)
      nextTemp -= absorbed
    }
    const afterTemp = nextTemp + (dmg - Math.min(tempHp, dmg))
    // Quanto sobra pra HP real:
    const toHp = Math.max(0, dmg - tempHp)
    nextHp = Math.max(0, curHp - toHp)
    if (nextHp === 0) {
      sideEffects.droppedTo0 = true
      const remaining = toHp - curHp
      // Massive damage: dano remanescente >= maxHp → morte instantânea.
      if (remaining >= maxHp && maxHp > 0) {
        sideEffects.instakill = true
        nextIsDead = true
        nextDeathSaves = { successes: 0, failures: 3 }
      } else {
        // Caiu pra 0: zera death saves anteriores; começa fluxo limpo.
        nextDeathSaves = emptyDeathSaves()
        nextIsStable = false
      }
    }
  }

  return {
    character: {
      ...character,
      combat: {
        ...combat,
        tempHp: nextTemp,
        currentHp: nextHp,
        deathSaves: nextDeathSaves,
        isStable: nextIsStable,
        isDead: nextIsDead,
        // Concentração mantida — caller decide se quebra após save.
      },
    },
    sideEffects,
  }
}

/**
 * Cura. Não restaura tempHp (PHB p.198: tempHp é separado).
 * Se estava a 0 HP, revive → zera testes de morte e remove `isStable`.
 * Personagem morto NÃO pode ser curado por essa função (precisa Reviver).
 */
export function applyHealing(character, amount) {
  const heal = Math.max(0, Math.floor(Number(amount) || 0))
  const sideEffects = { healed: 0, revived: false }
  if (heal === 0) return { character, sideEffects }

  const combat = character.combat ?? {}
  if (combat.isDead) return { character, sideEffects }

  const maxHp = combat.maxHp ?? 0
  const curHp = combat.currentHp ?? 0
  const newHp = clampHp(curHp + heal, maxHp)
  sideEffects.healed = newHp - curHp

  const wasAt0 = curHp === 0
  const revived = wasAt0 && newHp > 0
  if (revived) sideEffects.revived = true

  return {
    character: {
      ...character,
      combat: {
        ...combat,
        currentHp: newHp,
        deathSaves: revived ? emptyDeathSaves() : (combat.deathSaves ?? emptyDeathSaves()),
        isStable: revived ? false : !!combat.isStable,
      },
    },
    sideEffects,
  }
}

/**
 * Ganha PV temporários. PHB p.198: não acumulam — vale o maior.
 */
export function gainTempHp(character, amount) {
  const gain = Math.max(0, Math.floor(Number(amount) || 0))
  const combat = character.combat ?? {}
  const current = combat.tempHp ?? 0
  const next = Math.max(current, gain)
  return {
    character: {
      ...character,
      combat: { ...combat, tempHp: next },
    },
  }
}

/**
 * Estabiliza personagem a 0 HP (PHB p.197). Após Medicina DC 10 ou
 * spare-the-dying. Mantém a 0 HP mas para de fazer testes de morte.
 */
export function stabilizeCharacter(character) {
  const combat = character.combat ?? {}
  if (combat.currentHp > 0) return character // não faz sentido pra quem está consciente.
  if (combat.isDead) return character
  return {
    ...character,
    combat: {
      ...combat,
      isStable: true,
      deathSaves: emptyDeathSaves(),
    },
  }
}

/**
 * Rola UM teste de morte (PHB p.197).
 * Caller pode passar `roll` (1-20) ou deixar a função rolar.
 * Nat 1 = 2 falhas. Nat 20 = recupera com 1 HP (limpa death saves e isStable).
 * 10-19 = sucesso; 1-9 = falha.
 * 3 sucessos = estabiliza (zera death saves, mantém 0 HP).
 * 3 falhas = morte (isDead=true).
 *
 * Retorna { character, result: { roll, success, failure, twoFails,
 *   recovered, stabilized, died, successesAfter, failuresAfter } }.
 */
export function rollDeathSave(character, { roll } = {}) {
  const combat = character.combat ?? {}
  if (combat.isDead) {
    return { character, result: { roll: null, blocked: 'dead' } }
  }
  if (combat.currentHp > 0) {
    return { character, result: { roll: null, blocked: 'conscious' } }
  }
  if (combat.isStable) {
    return { character, result: { roll: null, blocked: 'stable' } }
  }

  const d20 = Number.isInteger(roll) && roll >= 1 && roll <= 20
    ? roll
    : Math.floor(Math.random() * 20) + 1

  const ds = combat.deathSaves ?? emptyDeathSaves()
  let successes = ds.successes ?? 0
  let failures  = ds.failures  ?? 0
  const result = {
    roll: d20,
    success: false,
    failure: false,
    twoFails: false,
    recovered: false,
    stabilized: false,
    died: false,
  }

  if (d20 === 20) {
    // Recupera com 1 HP (PHB p.197).
    result.recovered = true
    return {
      character: {
        ...character,
        combat: {
          ...combat,
          currentHp: 1,
          deathSaves: emptyDeathSaves(),
          isStable: false,
        },
      },
      result: { ...result, successesAfter: 0, failuresAfter: 0 },
    }
  }

  if (d20 === 1) {
    // 2 falhas.
    result.twoFails = true
    result.failure = true
    failures = Math.min(3, failures + 2)
  } else if (d20 >= 10) {
    result.success = true
    successes = Math.min(3, successes + 1)
  } else {
    result.failure = true
    failures = Math.min(3, failures + 1)
  }

  let died = false
  let stabilized = false
  let isStableNext = combat.isStable ?? false
  if (failures >= 3) {
    died = true
    result.died = true
  } else if (successes >= 3) {
    stabilized = true
    isStableNext = true
    successes = 0
    failures = 0
    result.stabilized = true
  }

  return {
    character: {
      ...character,
      combat: {
        ...combat,
        deathSaves: stabilized ? emptyDeathSaves() : { successes, failures },
        isStable: isStableNext,
        isDead: died,
      },
    },
    result: { ...result, successesAfter: successes, failuresAfter: failures },
  }
}
