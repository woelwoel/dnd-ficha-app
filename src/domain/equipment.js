/**
 * Tabela de armaduras/escudos do PHB (cap. 5) e utilitários de CA.
 *
 * Cada entrada: { type, category, baseAC, maxDex, strMin, stealthDisadv }
 *  - type         : 'armor' | 'shield'
 *  - category     : 'light' | 'medium' | 'heavy' | 'shield'
 *  - baseAC       : CA base da armadura (escudo usa +2 aditivo)
 *  - maxDex       : limite de modificador de Destreza somado (null = sem limite)
 *  - strMin       : requisito de Força (aviso; não bloqueante)
 *  - stealthDisadv: desvantagem em Furtividade
 *
 * Chaves também mapeiam nomes PT-BR da SRD; consulte `findArmorByName`
 * para casar itens do inventário por heurística de prefixo.
 */

export const ARMOR_TABLE = {
  // Armaduras leves
  padded:           { type: 'armor', category: 'light',  baseAC: 11, maxDex: null, strMin: 0,  stealthDisadv: true  },
  leather:          { type: 'armor', category: 'light',  baseAC: 11, maxDex: null, strMin: 0,  stealthDisadv: false },
  'studded-leather':{ type: 'armor', category: 'light',  baseAC: 12, maxDex: null, strMin: 0,  stealthDisadv: false },
  // Armaduras médias
  hide:             { type: 'armor', category: 'medium', baseAC: 12, maxDex: 2,    strMin: 0,  stealthDisadv: false },
  'chain-shirt':    { type: 'armor', category: 'medium', baseAC: 13, maxDex: 2,    strMin: 0,  stealthDisadv: false },
  'scale-mail':     { type: 'armor', category: 'medium', baseAC: 14, maxDex: 2,    strMin: 0,  stealthDisadv: true  },
  breastplate:      { type: 'armor', category: 'medium', baseAC: 14, maxDex: 2,    strMin: 0,  stealthDisadv: false },
  'half-plate':     { type: 'armor', category: 'medium', baseAC: 15, maxDex: 2,    strMin: 0,  stealthDisadv: true  },
  // Armaduras pesadas
  'ring-mail':      { type: 'armor', category: 'heavy',  baseAC: 14, maxDex: 0,    strMin: 0,  stealthDisadv: true  },
  'chain-mail':     { type: 'armor', category: 'heavy',  baseAC: 16, maxDex: 0,    strMin: 13, stealthDisadv: true  },
  splint:           { type: 'armor', category: 'heavy',  baseAC: 17, maxDex: 0,    strMin: 15, stealthDisadv: true  },
  plate:            { type: 'armor', category: 'heavy',  baseAC: 18, maxDex: 0,    strMin: 15, stealthDisadv: true  },
  // Escudo
  shield:           { type: 'shield', category: 'shield', baseAC: 2,  maxDex: null, strMin: 0,  stealthDisadv: false },
}

/** Nomes PT-BR → índice. Usado para detectar armadura a partir do nome do item. */
const PT_BR_ALIASES = {
  'armadura acolchoada': 'padded',
  'acolchoada': 'padded',
  'gibão de couro': 'leather',
  'couro': 'leather',
  'couro batido': 'studded-leather',
  'gibão de peles': 'hide',
  'peles': 'hide',
  'camisão de malha': 'chain-shirt',
  'brunea': 'scale-mail',
  'cota de escamas': 'scale-mail',
  'peitoral': 'breastplate',
  'meia-armadura': 'half-plate',
  'cota de anéis': 'ring-mail',
  'cota de malha': 'chain-mail',
  'cota': 'chain-mail',
  'corselete': 'splint',
  'lamelar': 'splint',
  'placas': 'plate',
  'placa': 'plate',
  'armadura de placas': 'plate',
  'escudo': 'shield',
}

/**
 * Tenta identificar armadura/escudo a partir do nome do item (em PT-BR ou EN).
 * Retorna a entrada da tabela ou `null`.
 */
export function findArmorByName(name) {
  if (!name) return null
  const norm = name.trim().toLowerCase()
  // 1. Alias PT-BR exato ou prefixo
  for (const [alias, key] of Object.entries(PT_BR_ALIASES)) {
    if (norm === alias || norm.startsWith(alias + ' ') || norm.includes(alias)) {
      return { ...ARMOR_TABLE[key], key }
    }
  }
  // 2. Chave EN direta (itens vindos da SRD em inglês)
  const enKey = norm.replace(/\s+/g, '-')
  if (ARMOR_TABLE[enKey]) return { ...ARMOR_TABLE[enKey], key: enKey }
  return null
}

/**
 * Mapeia categoria de armadura → chaves de proficiência aceitas.
 * Aceita formato EN ('light', 'medium', 'heavy', 'shields') e PT-BR
 * ('leve', 'media', 'pesada', 'escudos').
 */
const ARMOR_CATEGORY_PROFICIENCY = {
  light:  ['light', 'leve', 'light-armor', 'armaduras-leves'],
  medium: ['medium', 'media', 'média', 'medium-armor', 'armaduras-médias'],
  heavy:  ['heavy', 'pesada', 'heavy-armor', 'armaduras-pesadas'],
  shield: ['shield', 'shields', 'escudo', 'escudos'],
}

/** Verifica se o personagem é proficiente em uma categoria de armadura/escudo. */
export function hasArmorProficiency(profList, category) {
  if (!profList || profList.length === 0) return false
  const accepted = new Set(ARMOR_CATEGORY_PROFICIENCY[category] ?? [])
  return profList.some(p => accepted.has(String(p).toLowerCase()))
}

/**
 * Calcula a CA a partir da armadura/escudo equipados + atributos + classe.
 *
 * Regra (PHB p.144–145):
 *  - Sem armadura: CA = 10 + DES (Unarmored Defense do bárbaro adiciona CON,
 *    do monge adiciona SAB — monge perde a feature ao usar escudo).
 *  - Leve:   baseAC + DES
 *  - Média:  baseAC + min(DES, 2)
 *  - Pesada: baseAC (ignora DES)
 *  - Escudo: +2 em qualquer uma das opções acima.
 *
 * Penalidades retornadas em `warnings[]` (não modificam CA):
 *  - Sem proficiência na armadura/escudo equipado (PHB p.144).
 *  - FOR < strMin em armadura pesada → speedPenalty: 10 (PHB p.144).
 *
 * @param {object} params
 * @param {object} params.mods       - { dex, con, wis, ... }
 * @param {object} [params.attributes] - { str, dex, ... } (para checar strMin)
 * @param {string} params.classIndex - índice da classe primária
 * @param {object|null} params.armor - entrada de ARMOR_TABLE ou null
 * @param {boolean} params.hasShield - true se um escudo está equipado
 * @param {string[]} [params.armorProficiencies] - lista de proficiências
 * @returns {{ ac:number, warnings:string[], speedPenalty:number,
 *             noProficiency:boolean }}
 */
export function calculateArmorClass({
  mods,
  attributes = null,
  classIndex,
  armor,
  hasShield,
  armorProficiencies = [],
}) {
  const dexMod = mods?.dex ?? 0
  const conMod = mods?.con ?? 0
  const wisMod = mods?.wis ?? 0
  const warnings = []
  let speedPenalty = 0

  let base
  if (!armor) {
    if (classIndex === 'barbaro') {
      // Bárbaro mantém Unarmored Defense mesmo com escudo (PHB p.48).
      base = 10 + dexMod + conMod
    } else if (classIndex === 'monge' && !hasShield) {
      base = 10 + dexMod + wisMod
    } else {
      base = 10 + dexMod
    }
  } else if (armor.category === 'light') {
    base = armor.baseAC + dexMod
  } else if (armor.category === 'medium') {
    const cappedDex = armor.maxDex == null ? dexMod : Math.min(dexMod, armor.maxDex)
    base = armor.baseAC + cappedDex
  } else if (armor.category === 'heavy') {
    base = armor.baseAC
  } else {
    base = 10 + dexMod
  }

  if (hasShield) base += ARMOR_TABLE.shield.baseAC

  // ── Avisos de regra (não modificam CA) ─────────────────────
  let noProficiency = false
  if (armor && !hasArmorProficiency(armorProficiencies, armor.category)) {
    warnings.push(
      `Sem proficiência em armadura ${armor.category} — desvantagem em testes/saves de FOR/DES e ` +
      `não pode conjurar magias (PHB p.144).`
    )
    noProficiency = true
  }
  if (hasShield && !hasArmorProficiency(armorProficiencies, 'shield')) {
    warnings.push('Sem proficiência em escudo — mesmas penalidades acima (PHB p.144).')
    noProficiency = true
  }

  if (armor && armor.strMin > 0 && attributes) {
    const str = attributes.str ?? 10
    if (str < armor.strMin) {
      speedPenalty = 10
      warnings.push(
        `FOR ${str} < ${armor.strMin} requerida pela armadura — velocidade -10 ft (PHB p.144).`
      )
    }
  }

  return { ac: base, warnings, speedPenalty, noProficiency }
}

/**
 * Compat: alguns consumidores antigos esperavam apenas o número da CA.
 * Internamente chama o novo `calculateArmorClass` e retorna `.ac`.
 */
export function calculateArmorClassValue(params) {
  return calculateArmorClass(params).ac
}

/**
 * Descobre armadura e escudo equipados em um `inventory.items[]`.
 * Um item é considerado armadura/escudo se: tiver `armorType` explícito
 * OU `findArmorByName(item.name)` reconhecer. Apenas itens com
 * `equipped === true` contam.
 */
export function getEquippedArmor(items) {
  let armor = null
  let hasShield = false
  for (const item of items ?? []) {
    if (!item?.equipped) continue
    // Prefere campo explícito (vindo do SRD search)
    const explicitKey = item.armorKey
    const resolved = explicitKey && ARMOR_TABLE[explicitKey]
      ? { ...ARMOR_TABLE[explicitKey], key: explicitKey }
      : findArmorByName(item.name)
    if (!resolved) continue
    if (resolved.type === 'shield') hasShield = true
    else if (!armor) armor = resolved  // primeira armadura equipada prevalece
  }
  return { armor, hasShield }
}
