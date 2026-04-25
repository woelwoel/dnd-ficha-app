import { getModifier } from './calculations'

/* ── Multiclasse: tipo de conjurador por classe (PHB p.164) ────── */

/**
 * Bruxo é OMITIDO desta tabela porque usa Pact Magic (slots separados,
 * sempre no nível mais alto disponível, recarregam em descanso curto).
 * Tudo que NÃO está aqui é tratado como `'none'`.
 */
export const CASTER_TYPE = {
  bardo:      'full',
  clerigo:    'full',
  druida:     'full',
  feiticeiro: 'full',
  mago:       'full',
  paladino:   'half',
  patrulheiro:'half',
}

const SPELLCASTING_CLASSES_INCL_PACT = new Set([
  ...Object.keys(CASTER_TYPE),
  'bruxo',
])

/**
 * Diz se uma classe é conjuradora de qualquer tipo (full, half ou pact).
 * Útil para filtros de UI e detecção de "warlock puro" em descanso curto.
 */
export function isSpellcaster(classIndex) {
  return SPELLCASTING_CLASSES_INCL_PACT.has(classIndex)
}

/**
 * Diz se uma classe usa a tabela unificada de slots (full/half), excluindo
 * o Bruxo. Usado para decidir se um personagem entra em
 * `calculateUnifiedSpellSlots`.
 */
export function isUnifiedSlotCaster(classIndex) {
  return CASTER_TYPE[classIndex] != null
}

/* ── Tabela de slots (nível efetivo 1–20) ─────────────────────── */
/**
 * Tabela oficial PHB p.165 / SRD §classes.spell-slots.
 * Cada linha: [1°,2°,3°,4°,5°,6°,7°,8°,9°] espaços disponíveis.
 *
 * Esta MESMA tabela vale para single-class full caster (Mago 5 = linha 5)
 * e para o "level efetivo" combinado de multiclasse (PHB p.164).
 */
const SPELL_SLOTS_TABLE = [
  [2,0,0,0,0,0,0,0,0], // 1
  [3,0,0,0,0,0,0,0,0], // 2
  [4,2,0,0,0,0,0,0,0], // 3
  [4,3,0,0,0,0,0,0,0], // 4
  [4,3,2,0,0,0,0,0,0], // 5
  [4,3,3,0,0,0,0,0,0], // 6
  [4,3,3,1,0,0,0,0,0], // 7
  [4,3,3,2,0,0,0,0,0], // 8
  [4,3,3,3,1,0,0,0,0], // 9
  [4,3,3,3,2,0,0,0,0], // 10
  [4,3,3,3,2,1,0,0,0], // 11
  [4,3,3,3,2,1,0,0,0], // 12
  [4,3,3,3,2,1,1,0,0], // 13
  [4,3,3,3,2,1,1,0,0], // 14
  [4,3,3,3,2,1,1,1,0], // 15
  [4,3,3,3,2,1,1,1,0], // 16
  [4,3,3,3,2,1,1,1,1], // 17
  [4,3,3,3,3,1,1,1,1], // 18
  [4,3,3,3,3,2,1,1,1], // 19
  [4,3,3,3,3,2,2,1,1], // 20
]

/**
 * Slots de Pact Magic do Bruxo por nível (PHB p.107).
 * Índice = nível do bruxo - 1; valor = [qty, slotLevel].
 */
const WARLOCK_PACT_SLOTS = [
  [1, 1], [2, 1], [2, 2], [2, 2], [2, 3],
  [2, 3], [2, 4], [2, 4], [2, 5], [2, 5],
  [3, 5], [3, 5], [3, 5], [3, 5], [3, 5],
  [3, 5], [4, 5], [4, 5], [4, 5], [4, 5],
]

/**
 * Retorna os slots de Pact Magic do Bruxo para o nível dado.
 * @returns {{ qty: number, slotLevel: number } | null}
 */
export function getWarlockPactSlots(warlockLevel) {
  if (!warlockLevel || warlockLevel < 1) return null
  const idx = Math.min(20, Math.floor(warlockLevel)) - 1
  const [qty, slotLevel] = WARLOCK_PACT_SLOTS[idx]
  return { qty, slotLevel }
}

/**
 * Calcula o "nível efetivo de conjurador" (PHB p.164) somando:
 *   - níveis completos das classes 'full'
 *   - floor(level/2) das classes 'half', POR CLASSE (não na soma).
 *
 * O Bruxo (Pact Magic) é IGNORADO aqui — ele tem slots próprios.
 *
 * @param {string} primaryClass
 * @param {number} primaryLevel
 * @param {Array<{class:string, level:number}>} multiclasses
 * @returns {{ effectiveLevel:number, hasUnifiedCaster:boolean }}
 */
export function computeEffectiveCasterLevel(primaryClass, primaryLevel, multiclasses = []) {
  const all = [{ class: primaryClass, level: primaryLevel }, ...(multiclasses ?? [])]
  let eff = 0
  let has = false
  for (const { class: cls, level } of all) {
    if (!cls || !level) continue
    const t = CASTER_TYPE[cls]
    if (t === 'full')      { eff += level;                     has = true }
    else if (t === 'half') { eff += Math.floor(level / 2);     has = true }
    // bruxo, ladino-arcano, guerreiro-cavaleiro etc. ficam fora.
  }
  return { effectiveLevel: eff, hasUnifiedCaster: has }
}

/**
 * Retorna os slots de magia do personagem.
 *
 * Trata uniformemente single-class e multiclasse — single-class é apenas
 * o caso particular onde `multiclasses = []`. Bruxo (Pact Magic) é tratado
 * separadamente; quando o personagem é APENAS Bruxo, esta função retorna
 * `null` (use `getWarlockPactSlots`). Quando há mistura (Bruxo + outra
 * conjuradora), o Bruxo soma `null` ao efetivo (Pact é independente).
 *
 * @param {string} primaryClass
 * @param {number} primaryLevel
 * @param {Array<{class:string, level:number}>} [multiclasses]
 * @returns {Object<number, number>|null}  { 1: 4, 2: 3, ... } ou null
 */
export function getSpellSlots(primaryClass, primaryLevel, multiclasses = []) {
  const { effectiveLevel, hasUnifiedCaster } = computeEffectiveCasterLevel(
    primaryClass, primaryLevel, multiclasses
  )
  if (!hasUnifiedCaster || effectiveLevel < 1) return null
  const row = SPELL_SLOTS_TABLE[Math.min(20, effectiveLevel) - 1]
  const result = {}
  for (let i = 0; i < 9; i++) {
    if (row[i] > 0) result[i + 1] = row[i]
  }
  return result
}

/**
 * @deprecated Use `getSpellSlots`. Mantido só para retrocompat em testes
 *             antigos: mesma assinatura, mas devolve null para single-class
 *             para preservar o comportamento legado.
 */
export function calculateMulticlassSpellSlots(primaryClass, primaryLevel, multiclasses) {
  if (!multiclasses?.length) return null
  return getSpellSlots(primaryClass, primaryLevel, multiclasses)
}

/**
 * Clampa `usedSlots` ao máximo permitido por nível. Garante invariante
 * `usedSlots[lvl] ≤ maxSlots[lvl]` e remove níveis com max=0.
 *
 * @param {Object<number,number>} usedSlots
 * @param {Object<number,number>|null} maxSlots
 * @returns {Object<number,number>} novo objeto com valores válidos
 */
export function clampUsedSlots(usedSlots, maxSlots) {
  if (!maxSlots) return {}
  const out = {}
  for (const [lvl, max] of Object.entries(maxSlots)) {
    const used = Number(usedSlots?.[lvl] ?? 0)
    if (max > 0) out[lvl] = Math.max(0, Math.min(max, used))
  }
  return out
}

/**
 * Clampa o contador de Pact Slots usados.
 */
export function clampPactSlotsUsed(used, warlockLevel) {
  const pact = getWarlockPactSlots(warlockLevel)
  if (!pact) return 0
  return Math.max(0, Math.min(pact.qty, Number(used ?? 0)))
}

/* ── Mecânicas de "preparado vs conhecido" ─────────────────────── */

/**
 * Configuração das classes que PREPARAM (PHB cap.3).
 *
 *  - mago     : INT, level inteiro, tem cantrips, MANTÉM grimório (6 + 2·(N-1)).
 *  - clerigo  : SAB, level inteiro, tem cantrips.
 *  - druida   : SAB, level inteiro, tem cantrips.
 *  - paladino : CAR, level/2 (half-caster), SEM cantrips.
 */
const PREPARE_CONFIG = {
  mago:      { ability: 'int', halfLevel: false, hasCantrips: true,  hasSpellbook: true  },
  clerigo:   { ability: 'wis', halfLevel: false, hasCantrips: true,  hasSpellbook: false },
  druida:    { ability: 'wis', halfLevel: false, hasCantrips: true,  hasSpellbook: false },
  paladino:  { ability: 'cha', halfLevel: true,  hasCantrips: false, hasSpellbook: false },
}

const KNOWN_CLASSES = new Set(['bardo', 'feiticeiro', 'bruxo', 'patrulheiro'])

/**
 * Retorna as regras de conjuração para uma classe específica do personagem.
 * Em multiclasse, chame uma vez por classe conjuradora.
 *
 * @param {string} classIndex - índice PT-BR da classe (ex: 'mago', 'bardo')
 * @param {number} level      - nível DAQUELA classe (1–20)
 * @param {object} attributes - { str, dex, ..., cha }
 * @param {object} levelData  - SRD level data (para cantrips_known/spells_known)
 */
export function getSpellcastingRules(classIndex, level, attributes, levelData) {
  if (PREPARE_CONFIG[classIndex]) {
    const cfg = PREPARE_CONFIG[classIndex]
    const abilityMod = getModifier(attributes?.[cfg.ability] ?? 10)
    const effLevel   = cfg.halfLevel ? Math.floor(level / 2) : level
    // Half-casters (paladino, patrulheiro) começam a conjurar no nível 2
    // (PHB p.84/89). Antes disso o limite é 0.
    const spellsLimit = effLevel > 0 ? Math.max(1, abilityMod + effLevel) : 0

    // Mago: grimório de 6 magias no nível 1 + 2 a cada nível seguinte (PHB p.114).
    const spellbookSize = cfg.hasSpellbook
      ? 6 + Math.max(0, level - 1) * 2
      : null

    return {
      type: 'prepared',
      ability: cfg.ability,
      spellsLabel:   'Magias preparadas',
      spellsLimit,
      cantripsLimit: cfg.hasCantrips ? (levelData?.cantrips_known ?? null) : null,
      spellbookSize,
      hasSpellbook:  cfg.hasSpellbook,
    }
  }
  if (KNOWN_CLASSES.has(classIndex)) {
    return {
      type: 'known',
      // Bardo→CAR, Feiticeiro→CAR, Bruxo→CAR, Patrulheiro→SAB.
      ability: classIndex === 'patrulheiro' ? 'wis' : 'cha',
      spellsLabel:   'Magias conhecidas',
      spellsLimit:   levelData?.spells_known   ?? null,
      cantripsLimit: levelData?.cantrips_known ?? null,
      spellbookSize: null,
      hasSpellbook:  false,
    }
  }
  return { type: 'none', ability: null, spellsLimit: null, cantripsLimit: null, spellbookSize: null, hasSpellbook: false }
}

/**
 * CD/Ataque mágico de UMA classe específica do personagem.
 * Útil quando há multiclasse híbrida (Mago+Clérigo).
 *
 * @param {string} classIndex
 * @param {number} totalProfBonus - prof do nível TOTAL do personagem
 * @param {object} attributes
 * @returns {{ ability:string|null, save:number|null, attack:number|null }}
 */
export function getClassSpellMath(classIndex, totalProfBonus, attributes) {
  const cfg = PREPARE_CONFIG[classIndex]
  const ability = cfg?.ability
    ?? (KNOWN_CLASSES.has(classIndex)
      ? (classIndex === 'patrulheiro' ? 'wis' : 'cha')
      : null)
  if (!ability) return { ability: null, save: null, attack: null }
  const mod = getModifier(attributes?.[ability] ?? 10)
  return {
    ability,
    save:   8 + totalProfBonus + mod,
    attack: totalProfBonus + mod,
  }
}
