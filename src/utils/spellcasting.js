import { getModifier } from './calculations'

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
