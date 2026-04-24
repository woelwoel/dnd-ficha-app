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

// Formato com sinal: +3, -1, +0
export function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

// Bônus de proficiência pelo nível
export function getProficiencyBonus(level) {
  return Math.ceil(level / 4) + 1
}

/**
 * HP máximo para classe única (sem multiclasse). Para multiclasse, use
 * `calculateMaxHpMulticlass` em `domain/rules.js`.
 *
 * Regra 5e:
 *  - Nível 1: hitDie + CON
 *  - Níveis 2+: (média arredondada p/ cima + CON) por nível adicional
 */
export function calculateMaxHp(classData, level, conScore) {
  if (!classData) return 0
  const conMod = getModifier(conScore)
  const hitDie = classData.hit_die || 8
  const avgPerLevel = Math.floor(hitDie / 2) + 1
  const first = hitDie + conMod
  const rest = Math.max(0, level - 1) * (avgPerLevel + conMod)
  return Math.max(1, first + rest)
}

export function calculateInitiative(dexScore) {
  return getModifier(dexScore)
}

export function calculatePassivePerception(wisScore, profBonus, isProficient, isExpert = false) {
  const wisMod = getModifier(wisScore)
  return 10 + wisMod + (isProficient ? profBonus : 0) + (isExpert ? profBonus : 0)
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

  // Separa lista de itens de eventual "lore" (sequência de maiúsculas sinaliza início de nome próprio)
  const loreIdx = equipmentStr.search(/\s[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]{5,15}/)
  const clean = loreIdx > 0 ? equipmentStr.slice(0, loreIdx).trim() : equipmentStr.trim()
  const rawParts = clean.split(/,\s*(?:e\s+)?|\s+e\s+(?=[^,]+$)/)
    .map(s => s.trim())
    .filter(Boolean)

  const items = []
  let gold = 0
  for (const part of rawParts) {
    const goldMatch = part.match(/(\d+)\s*po\b/i)
    if (goldMatch && /algibeira|bolsa|saco/i.test(part)) {
      gold = parseInt(goldMatch[1], 10) || 0
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
