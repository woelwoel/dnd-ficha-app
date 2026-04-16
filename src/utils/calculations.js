// Modifier from ability score: floor((score - 10) / 2)
export function getModifier(score) {
  return Math.floor((score - 10) / 2)
}

// Format modifier with sign: +3, -1, +0
export function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

// Proficiency bonus by level
export function getProficiencyBonus(level) {
  return Math.ceil(level / 4) + 1
}

// Max HP at level 1: hit die max + CON modifier
// For higher levels: average hit die + CON modifier per level
export function calculateMaxHp(classData, level, conScore) {
  if (!classData) return 0
  const conMod = getModifier(conScore)
  const hitDie = classData.hit_die || 8
  // Level 1: max hit die + CON mod
  // Level 2+: average (rounded up) + CON mod per additional level
  const avgPerLevel = Math.floor(hitDie / 2) + 1
  return hitDie + conMod + (level - 1) * (avgPerLevel + conMod)
}

// Initiative = DEX modifier
export function calculateInitiative(dexScore) {
  return getModifier(dexScore)
}

// Passive Perception = 10 + Perception modifier (+ profBonus se especialização)
export function calculatePassivePerception(wisScore, profBonus, isProficient, isExpert = false) {
  const wisMod = getModifier(wisScore)
  return 10 + wisMod + (isProficient ? profBonus : 0) + (isExpert ? profBonus : 0)
}

// Skill modifier = ability modifier + (proficient ? profBonus : 0) + (expertise ? profBonus : 0)
export function calculateSkillModifier(abilityScore, profBonus, proficient, expertise) {
  const abilityMod = getModifier(abilityScore)
  const profMod = proficient ? profBonus : 0
  const expertiseMod = expertise ? profBonus : 0
  return abilityMod + profMod + expertiseMod
}

// Saving throw = ability modifier + (proficient ? profBonus : 0)
export function calculateSavingThrow(abilityScore, profBonus, proficient) {
  return getModifier(abilityScore) + (proficient ? profBonus : 0)
}

// Spell Save DC = 8 + profBonus + spellcasting ability modifier
export function calculateSpellSaveDC(abilityScore, profBonus) {
  return 8 + profBonus + getModifier(abilityScore)
}

// Spell Attack Bonus = profBonus + spellcasting ability modifier
export function calculateSpellAttackBonus(abilityScore, profBonus) {
  return profBonus + getModifier(abilityScore)
}

// Standard Array for ability scores
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

// Ability score names
export const ABILITY_SCORES = [
  { key: 'str', name: 'Força', abbr: 'FOR' },
  { key: 'dex', name: 'Destreza', abbr: 'DES' },
  { key: 'con', name: 'Constituição', abbr: 'CON' },
  { key: 'int', name: 'Inteligência', abbr: 'INT' },
  { key: 'wis', name: 'Sabedoria', abbr: 'SAB' },
  { key: 'cha', name: 'Carisma', abbr: 'CAR' },
]

// 18 D&D 5e skills
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
