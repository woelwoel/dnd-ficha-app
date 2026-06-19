/**
 * Cálculos puros de regras D&D 5e e constantes PT-BR.
 * Os mapeamentos canônicos de atributos estão em `domain/attributes.js` —
 * re-exportados aqui para retrocompatibilidade com arquivos antigos.
 */

import {
  ABILITIES as _ABILITIES,
  abbrOfKey,
  nameOfKey,
} from '../domain/attributes'

/* ── Re-export de mapeamentos (compat) ───────────────────────────── */

// Formato usado no código legado: { FOR: 'str', DES: 'dex', ... }
export const ABBR_TO_KEY = Object.fromEntries(
  _ABILITIES.map(a => [a.abbrPt, a.key])
)

export const ATTR_NAME_TO_KEY = Object.fromEntries(
  _ABILITIES.map(a => [a.name, a.key])
)

export const SPELL_ABILITY_PT_TO_KEY = {
  'Inteligência': 'int',
  'Sabedoria':    'wis',
  'Carisma':      'cha',
}

export const ABILITY_SCORES = _ABILITIES.map(a => ({
  key:  a.key,
  name: a.name,
  abbr: a.abbrPt,
}))

/* ── Cálculos básicos ────────────────────────────────────────────── */

// Modificador: floor((score - 10) / 2)
export function getModifier(score) {
  return Math.floor((score - 10) / 2)
}

/**
 * Efeitos de exaustão (PHB p.291). Tabela cumulativa:
 *  1 — Desvantagem em testes de habilidade
 *  2 — Velocidade reduzida à metade
 *  3 — Desvantagem em ataques E salvaguardas
 *  4 — PV máximo reduzido à metade
 *  5 — Velocidade reduzida a 0
 *  6 — Morte
 *
 * Retorna flags + multiplicadores prontos para aplicar.
 */
export function getExhaustionEffects(level = 0) {
  const lvl = Math.max(0, Math.min(6, Math.floor(Number(level) || 0)))
  return {
    level: lvl,
    abilityCheckDisadvantage: lvl >= 1,
    attackDisadvantage: lvl >= 3,
    saveDisadvantage: lvl >= 3,
    /** Multiplicador de velocidade. 1 = sem mudança, 0.5 = metade, 0 = imóvel. */
    speedMultiplier: lvl >= 5 ? 0 : (lvl >= 2 ? 0.5 : 1),
    /** Multiplicador de maxHp. 1 = sem mudança, 0.5 = metade. */
    maxHpMultiplier: lvl >= 4 ? 0.5 : 1,
    dead: lvl >= 6,
  }
}

// Formato com sinal: +3, -1, +0
export function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

// Bônus de proficiência pelo nível
export function getProficiencyBonus(level) {
  return Math.ceil(level / 4) + 1
}

/**
 * HP máximo multiclasse a partir dos dados de vida por classe (PHB p.12 e p.164).
 * Fonte única da fórmula — usada por `calculateMaxHp` (single-class),
 * `calculateMaxHpMulticlass` (ficha) e pelo wizard de criação.
 *
 *  - Nível 1 da classe PRIMÁRIA: máximo do dado + CON.
 *  - Demais níveis (primária e multiclasses): média = floor(die/2)+1 + CON.
 *  - Cada nível garante no mínimo +1 (PHB p.15: "always gain at least 1 hp").
 *  - Talento Robusto (PHB p.170): +2 PV por nível TOTAL (passe `robustoLevels`).
 *
 * @param {object} p
 * @param {number} [p.primaryDie=8]    Dado de vida da classe primária (ex: 10).
 * @param {number} [p.primaryLevel=1]  Nível da classe primária.
 * @param {Array<{die:number, level:number}>} [p.extras=[]] Multiclasses.
 * @param {number} [p.conScore=10]     Valor de Constituição.
 * @param {number} [p.robustoLevels=0] Nível total se possui Robusto, senão 0.
 * @param {number} [p.racialHpPerLevel=0] PV racial por nível (ex: Tenacidade
 *        Anã do Anão da Colina = +1/nível, PHB p.20).
 * @returns {number}
 */
export function calculateMaxHpFromHitDice({
  primaryDie = 8, primaryLevel = 1, extras = [], conScore = 10,
  robustoLevels = 0, racialHpPerLevel = 0,
} = {}) {
  const conMod = getModifier(conScore)
  const avg = die => Math.max(1, Math.floor((die || 8) / 2) + 1 + conMod)
  let total = Math.max(1, (primaryDie || 8) + conMod)
  for (let l = 2; l <= (primaryLevel || 0); l++) total += avg(primaryDie)
  for (const e of extras) {
    for (let l = 1; l <= (e?.level ?? 0); l++) total += avg(e?.die ?? 8)
  }
  if (robustoLevels > 0) total += 2 * robustoLevels
  if (racialHpPerLevel > 0) {
    const totalLevels = (primaryLevel || 0) + extras.reduce((s, e) => s + (e?.level ?? 0), 0)
    total += racialHpPerLevel * totalLevels
  }
  return Math.max(1, total)
}

/**
 * PV racial por nível concedido pela sub-raça (PHB). Hoje só o Anão da Colina
 * (Tenacidade Anã: +1 PV por nível). Demais sub-raças = 0.
 */
export function racialHpPerLevel(subrace) {
  return subrace === 'anao-da-colina' ? 1 : 0
}

/**
 * HP máximo para classe única (sem multiclasse). Para multiclasse, use
 * `calculateMaxHpMulticlass` em `domain/rules.js` (ficha) ou
 * `calculateMaxHpFromHitDice` (wizard).
 */
export function calculateMaxHp(classData, level, conScore) {
  if (!classData) return 0
  return calculateMaxHpFromHitDice({
    primaryDie: classData.hit_die || 8,
    primaryLevel: level,
    conScore,
  })
}

/**
 * Iniciativa = mod DEX + bônus de feats.
 *
 * @param {number} dexScore
 * @param {object} [opts]
 * @param {Array<{index?:string,name?:string}>} [opts.feats]   Feats do personagem.
 * @param {number} [opts.miscBonus=0]                          Buff/item/etc.
 * @returns {number}
 */
export function calculateInitiative(dexScore, { feats = [], miscBonus = 0 } = {}) {
  let bonus = 0
  // PHB p.165 — Alerta (PT-BR) / Alert (EN)
  if (hasFeat(feats, ['alerta', 'alert'])) bonus += 5
  return getModifier(dexScore) + bonus + miscBonus
}

/**
 * Percepção Passiva = 10 + mod SAB (+ prof se proficiente, +2× se expert)
 *                     + Observant (+5) — PHB p.265.
 *
 * @param {number} wisScore
 * @param {number} profBonus
 * @param {boolean} isProficient
 * @param {boolean} [isExpert=false]
 * @param {object} [opts]
 * @param {Array<{index?:string,name?:string}>} [opts.feats]
 * @returns {number}
 */
export function calculatePassivePerception(wisScore, profBonus, isProficient, isExpert = false, { feats = [] } = {}) {
  const wisMod = getModifier(wisScore)
  // PHB p.169 — Observador (PT-BR) / Observant (EN)
  const observant = hasFeat(feats, ['observador', 'observant']) ? 5 : 0
  return 10 + wisMod
    + (isProficient ? profBonus : 0)
    + (isExpert ? profBonus : 0)
    + observant
}

/**
 * Helper interno: detecta feat por uma OU mais chaves (index ou nome
 * exato, case-insensitive). Aceita string ou array de strings — útil
 * para feats com ambos os nomes PT-BR e EN.
 *
 * Compara apenas igualdade exata (não substring) para evitar falsos
 * positivos do tipo 'alert' casando com 'alerta'.
 */
function hasFeat(feats, keys) {
  if (!Array.isArray(feats)) return false
  const keyList = (Array.isArray(keys) ? keys : [keys])
    .map(k => String(k).toLowerCase())
  return feats.some(f => {
    const idx = String(f?.index ?? '').toLowerCase()
    const nm  = String(f?.name  ?? '').toLowerCase()
    return keyList.some(k => idx === k || nm === k)
  })
}

export function calculateSkillModifier(abilityScore, profBonus, proficient, expertise) {
  const abilityMod = getModifier(abilityScore)
  const profMod = proficient ? profBonus : 0
  // Especialização (PHB p.96) requer que o personagem SEJA proficiente.
  // Sem proficiência, ignora o flag de expertise.
  const expertiseMod = (proficient && expertise) ? profBonus : 0
  return abilityMod + profMod + expertiseMod
}

export function calculateSavingThrow(abilityScore, profBonus, proficient) {
  return getModifier(abilityScore) + (proficient ? profBonus : 0)
}

export function calculateSpellSaveDC(abilityScore, profBonus) {
  return 8 + profBonus + getModifier(abilityScore)
}

export function calculateSpellAttackBonus(abilityScore, profBonus) {
  return profBonus + getModifier(abilityScore)
}

/* ── Constantes de criação de personagem ─────────────────────────── */

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

export const POINT_BUY_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }
export const POINT_BUY_BUDGET = 27

export const PT_CLASS_TO_EN = {
  barbaro: 'barbarian', bardo: 'bard', bruxo: 'warlock', clerigo: 'cleric',
  druida: 'druid', feiticeiro: 'sorcerer', guerreiro: 'fighter', ladino: 'rogue',
  mago: 'wizard', monge: 'monk', paladino: 'paladin', patrulheiro: 'ranger',
}

// Classes que PREPARAM magias vs CONHECEM
export const PREPARE_CLASSES = new Set(['mago', 'clerigo', 'druida', 'paladino'])

export const SCHOOL_ABBR = {
  abjuração: 'Abj', conjuração: 'Con', adivinhação: 'Adv', encantamento: 'Enc',
  evocação: 'Evo', ilusão: 'Ilu', necromancia: 'Nec', transmutação: 'Tra',
  abjuration: 'Abj', conjuration: 'Con', divination: 'Adv', enchantment: 'Enc',
  evocation: 'Evo', illusion: 'Ilu', necromancy: 'Nec', transmutation: 'Tra',
}

export function normalizeSpell(s) {
  return {
    ...s,
    desc: Array.isArray(s.desc) ? s.desc.join(' ') : (s.desc || ''),
    higher_level: Array.isArray(s.higher_level) ? s.higher_level.join(' ') : (s.higher_level || ''),
    casting_time: s.casting_time || s.castingTime || '',
    concentration: s.concentration || (typeof s.duration === 'string' && s.duration.toLowerCase().includes('concentra')),
    classes: Array.isArray(s.classes) ? s.classes : [],
  }
}

export const DND_LANGUAGES = [
  'Comum', 'Anão', 'Élfico', 'Gigante', 'Gnômico', 'Goblin', 'Halfling', 'Orc',
  'Abissal', 'Celestial', 'Dracônico', 'Linguagem das Trevas', 'Infernal',
  'Primordial', 'Silvano', 'Subterrâneo',
]

export const RACE_LANGUAGES = {
  'anao':      ['Comum', 'Anão'],
  'elfo':      ['Comum', 'Élfico'],
  'halfling':  ['Comum', 'Halfling'],
  'humano':    ['Comum'],
  'draconato': ['Comum', 'Dracônico'],
  'gnomo':     ['Comum', 'Gnômico'],
  'meio-elfo': ['Comum', 'Élfico'],
  'meio-orc':  ['Comum', 'Orc'],
  'tiefling':  ['Comum', 'Infernal'],
}

export const ALIGNMENTS = [
  'Leal e Bom', 'Neutro e Bom', 'Caótico e Bom',
  'Leal e Neutro', 'Neutro', 'Caótico e Neutro',
  'Leal e Mau', 'Neutro e Mau', 'Caótico e Mau',
]

/* ── 18 perícias D&D 5e ──────────────────────────────────────────── */

export const SKILLS = [
  { key: 'acrobatics',     name: 'Acrobacia',       ability: 'dex', abbr: 'DES' },
  { key: 'animal-handling',name: 'Adestramento',     ability: 'wis', abbr: 'SAB' },
  { key: 'arcana',         name: 'Arcanismo',        ability: 'int', abbr: 'INT' },
  { key: 'athletics',      name: 'Atletismo',        ability: 'str', abbr: 'FOR' },
  { key: 'deception',      name: 'Enganação',        ability: 'cha', abbr: 'CAR' },
  { key: 'history',        name: 'História',         ability: 'int', abbr: 'INT' },
  { key: 'insight',        name: 'Intuição',         ability: 'wis', abbr: 'SAB' },
  { key: 'intimidation',   name: 'Intimidação',      ability: 'cha', abbr: 'CAR' },
  { key: 'investigation',  name: 'Investigação',     ability: 'int', abbr: 'INT' },
  { key: 'medicine',       name: 'Medicina',         ability: 'wis', abbr: 'SAB' },
  { key: 'nature',         name: 'Natureza',         ability: 'int', abbr: 'INT' },
  { key: 'perception',     name: 'Percepção',        ability: 'wis', abbr: 'SAB' },
  { key: 'performance',    name: 'Atuação',          ability: 'cha', abbr: 'CAR' },
  { key: 'persuasion',     name: 'Persuasão',        ability: 'cha', abbr: 'CAR' },
  { key: 'religion',       name: 'Religião',         ability: 'int', abbr: 'INT' },
  { key: 'sleight-of-hand',name: 'Prestidigitação',  ability: 'dex', abbr: 'DES' },
  { key: 'stealth',        name: 'Furtividade',      ability: 'dex', abbr: 'DES' },
  { key: 'survival',       name: 'Sobrevivência',    ability: 'wis', abbr: 'SAB' },
]

/* ── Parser de equipamento de antecedente ────────────────────────── */

/**
 * Parseia texto livre de equipamento do antecedente.
 * Regex limitada (âncora no início) para evitar backtracking excessivo.
 */
export function parseBackgroundEquipment(equipmentStr) {
  if (!equipmentStr || typeof equipmentStr !== 'string') return { items: [], gold: 0 }

  // Corta a "lore" do antecedente. No phb-backgrounds-pt.json o equipamento
  // termina e em seguida vem o título da seção em CAIXA ALTA (ex:
  // "VIDA DE ISOLAMENTO", "ESQUEMAS PREDILETOS", "ROTINAS DE ARTISTA").
  // Detectamos a transição como DUAS+ palavras MAIÚSCULAS consecutivas
  // (cada uma com 2+ letras) — robusto contra palavras curtas tipo "DE/DA".
  // A regex anterior exigia 1 palavra com 5–15 chars, falhando no Eremita
  // ("VIDA DE" — 4+2 chars, ambas curtas) e vazando "po. VIDA DE" como item.
  const loreRe = /[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]{2,}(\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]{2,})+/
  const loreMatch = equipmentStr.match(loreRe)
  const loreIdx = loreMatch ? equipmentStr.indexOf(loreMatch[0]) : -1
  const clean = loreIdx > 0 ? equipmentStr.slice(0, loreIdx).trim() : equipmentStr.trim()
  const rawParts = clean.split(/,\s*(?:e\s+)?|\s+e\s+(?=[^,]+$)/)
    .map(s => s.trim().replace(/[.,;:]+$/, '')) // tira pontuação terminal residual
    .filter(Boolean)

  const items = []
  let gold = 0
  for (const part of rawParts) {
    // Detecção de "po" (peças de ouro). Trata como GOLD em três casos:
    //   1) parte é só "N po" / "5 po." → standalone (ex: Eremita)
    //   2) parte menciona algibeira/bolsa/saco — pouch tradicional
    //   3) parte é "uma algibeira contendo N po" sem mais palavras
    const goldStandalone = part.match(/^(\d+)\s*po\.?$/i)
    const goldInPouch    = part.match(/(\d+)\s*po\b/i)
    if (goldStandalone) {
      gold = parseInt(goldStandalone[1], 10) || 0
      continue
    }
    if (goldInPouch && /algibeira|bolsa|saco/i.test(part)) {
      gold = parseInt(goldInPouch[1], 10) || 0
      continue
    }
    const qtyMatch = part.match(/^(\d+)\s+(.+)/)
    if (qtyMatch) {
      items.push({ name: qtyMatch[2], qty: parseInt(qtyMatch[1], 10) || 1, source: 'background' })
    } else {
      items.push({ name: part, qty: 1, source: 'background' })
    }
  }
  return { items, gold }
}

// Extrai quantos idiomas extras o antecedente concede
export function parseBackgroundLanguageCount(langStr) {
  if (!langStr) return 0
  if (/dois|two|\b2\b/i.test(langStr)) return 2
  if (/uma?|one|\b1\b/i.test(langStr)) return 1
  return 0
}

/* ── Helpers de formatação (deprecados: preferir domain/attributes) ─ */

export const getAbbrOfKey = abbrOfKey
export const getNameOfKey = nameOfKey
