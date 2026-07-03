import { SKILLS } from '../../../utils/calculations'

const BY_KEY = Object.fromEntries(SKILLS.map(s => [s.key, s]))

export function skillBonus(character, calc, skillKey) {
  const skill = BY_KEY[skillKey]
  if (!skill) return 0
  const expert = character.proficiencies?.expertiseSkills?.includes(skillKey)
  const prof = character.proficiencies?.skills?.includes(skillKey)
  const profPart = expert ? 2 * calc.profBonus : prof ? calc.profBonus : 0
  return calc.mods[skill.ability] + profPart
}
