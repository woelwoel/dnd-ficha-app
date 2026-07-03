import { SKILLS } from '../../../utils/calculations'

const BY_KEY = Object.fromEntries(SKILLS.map(s => [s.key, s]))

export function skillBonus(character, calc, skillKey) {
  const skill = BY_KEY[skillKey]
  if (!skill) return 0
  const p = character.proficiencies ?? {}
  const prof = (p.skills?.includes(skillKey) ?? false) || (p.backgroundSkills?.includes(skillKey) ?? false)
  const expert = prof && (p.expertiseSkills?.includes(skillKey) ?? false)
  const profPart = expert ? 2 * calc.profBonus : prof ? calc.profBonus : 0
  return calc.mods[skill.ability] + profPart
}
