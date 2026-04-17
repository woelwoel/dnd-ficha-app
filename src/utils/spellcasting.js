import { getModifier } from './calculations'

/* ── Multiclasse: tipo de conjurador por classe ────────────────── */
const CASTER_TYPE = {
  bardo:      'full',
  clerigo:    'full',
  druida:     'full',
  feiticeiro: 'full',
  mago:       'full',
  bruxo:      'full',
  paladino:   'half',
  patrulheiro:'half',
}

/* ── Tabela de slots multiclasse (nível efetivo 1–20) ─────────── */
// Cada linha: [1°,2°,3°,4°,5°,6°,7°,8°,9°] espaços disponíveis
const MULTICLASS_SPELL_SLOTS = [
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
 * Calcula os espaços de magia fundidos para multiclasse (regra oficial D&D 5e).
 * Retorna null quando não há multiclasse conjuradora relevante.
 *
 * @param {string}  primaryClass   - índice PT-BR da classe primária
 * @param {number}  primaryLevel   - nível da classe primária
 * @param {Array}   multiclasses   - [{ class, level }, ...]
 * @returns {object|null}  { 1: N, 2: N, ... } ou null
 */
export function calculateMulticlassSpellSlots(primaryClass, primaryLevel, multiclasses) {
  if (!multiclasses?.length) return null
  const all = [{ class: primaryClass, level: primaryLevel }, ...(multiclasses ?? [])]
  let effectiveLevel = 0
  for (const { class: cls, level } of all) {
    const type = CASTER_TYPE[cls]
    if (type === 'full')  effectiveLevel += level
    else if (type === 'half') effectiveLevel += Math.floor(level / 2)
  }
  if (effectiveLevel < 1) return null
  const slots = MULTICLASS_SPELL_SLOTS[Math.min(20, effectiveLevel) - 1]
  const result = {}
  for (let i = 0; i < 9; i++) {
    if (slots[i] > 0) result[i + 1] = slots[i]
  }
  return result
}

/**
 * Mecânicas de conjuração por classe (D&D 5e SRD).
 *
 * Tipos:
 *  - 'known'    : classe CONHECE um número fixo de magias (bardo, feiticeiro, bruxo, patrulheiro).
 *                 Limite = `spells_known` da tabela SRD de nível.
 *  - 'prepared' : classe PREPARA magias da lista completa a cada descanso longo
 *                 (mago, clérigo, druida, paladino). Limite = modificador do atributo
 *                 + nível (ou nível/2 para paladino). Mago também tem um "grimório"
 *                 de 6 + 2·(nível−1) magias, mas para a ficha tratamos como lista
 *                 de preparadas do dia.
 *  - 'none'     : classe não conjura.
 *
 * Para CANTRIPS (truques), todas as classes que têm seguem `cantrips_known` do SRD.
 * Paladino e Patrulheiro não têm truques (cantrips_known ausente nos dados).
 */
const PREPARE_CONFIG = {
  mago:      { ability: 'int', halfLevel: false, hasCantrips: true  },
  clerigo:   { ability: 'wis', halfLevel: false, hasCantrips: true  },
  druida:    { ability: 'wis', halfLevel: false, hasCantrips: true  },
  paladino:  { ability: 'cha', halfLevel: true,  hasCantrips: false },
}

const KNOWN_CLASSES = new Set(['bardo', 'feiticeiro', 'bruxo', 'patrulheiro'])

/**
 * Retorna as regras de conjuração para um personagem.
 *
 * @param {string} classIndex - índice PT-BR da classe (ex: 'mago', 'bardo')
 * @param {number} level      - nível do personagem (1–20)
 * @param {object} attributes - objeto de atributos { str, dex, ..., cha }
 * @param {object} levelData  - spellcasting do SRD (pode ser null)
 */
export function getSpellcastingRules(classIndex, level, attributes, levelData) {
  if (PREPARE_CONFIG[classIndex]) {
    const cfg = PREPARE_CONFIG[classIndex]
    const abilityMod = getModifier(attributes?.[cfg.ability] ?? 10)
    const effLevel   = cfg.halfLevel ? Math.floor(level / 2) : level
    const spellsLimit = Math.max(1, abilityMod + effLevel)
    return {
      type: 'prepared',
      ability: cfg.ability,
      spellsLabel:  'Magias preparadas',
      spellsLimit,                                   // limite de magias de nível na ficha
      cantripsLimit: cfg.hasCantrips ? (levelData?.cantrips_known ?? null) : null,
    }
  }
  if (KNOWN_CLASSES.has(classIndex)) {
    return {
      type: 'known',
      spellsLabel:   'Magias conhecidas',
      spellsLimit:   levelData?.spells_known   ?? null,
      cantripsLimit: levelData?.cantrips_known ?? null,
    }
  }
  return { type: 'none', spellsLimit: null, cantripsLimit: null }
}
