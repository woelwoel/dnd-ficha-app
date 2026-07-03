import { SKILLS } from '../../../utils/calculations'

const BY_KEY = Object.fromEntries(SKILLS.map(s => [s.key, s]))

/**
 * Estado de proficiência de uma perícia — fonte única pro marcador e pro bônus.
 * Proficiente = está em `skills` OU `backgroundSkills` (antecedente). Especialização
 * (PHB p.96) só vale se o personagem já for proficiente.
 */
export function skillProficiencyState(proficiencies, skillKey) {
  const p = proficiencies ?? {}
  const prof = (p.skills?.includes(skillKey) ?? false) || (p.backgroundSkills?.includes(skillKey) ?? false)
  const expert = prof && (p.expertiseSkills?.includes(skillKey) ?? false)
  return { prof, expert }
}

export function skillBonus(character, calc, skillKey) {
  const skill = BY_KEY[skillKey]
  if (!skill) return 0
  const { prof, expert } = skillProficiencyState(character.proficiencies, skillKey)
  const profPart = expert ? 2 * calc.profBonus : prof ? calc.profBonus : 0
  return calc.mods[skill.ability] + profPart
}
