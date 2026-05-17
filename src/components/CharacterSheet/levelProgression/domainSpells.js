// src/components/CharacterSheet/levelProgression/domainSpells.js
// Enriquece o patch de level-up com as magias de domínio automáticas do
// Clérigo (níveis 1, 3, 5, 7, 9). Mantido fora do componente para teste.
import { getClericDomainSpellIndices } from '../../../domain/rules'

const DOMAIN_LEVELS = [1, 3, 5, 7, 9]

function mapSrdSpellToCharacter(s) {
  return {
    index: s.index,
    name:  s.name,
    level: s.level,
    school: typeof s.school === 'object' ? (s.school?.name ?? '') : (s.school ?? ''),
    castingTime: s.casting_time ?? '',
    range:       s.range ?? '',
    duration:    s.duration ?? '',
    concentration: s.concentration ?? false,
    components:  Array.isArray(s.components) ? s.components.join(', ') : (s.components ?? ''),
    desc:        s.desc ?? '',
    ritual:      s.ritual ?? false,
    source:      'domain',
  }
}

export function enrichWithClericDomainSpells({
  patch, classIndex, chosenFeatures, srdSpells,
}) {
  if (patch.multiclassIndex != null) return patch
  if (classIndex !== 'clerigo') return patch
  if (!DOMAIN_LEVELS.includes(patch.newLevel)) return patch

  const domain = patch.newChoices?.divine_domain ?? chosenFeatures?.divine_domain
  if (!domain) return patch

  const indices = getClericDomainSpellIndices(domain, patch.newLevel)
  const domainSpells = indices
    .map(idx => srdSpells?.find(s => s.index === idx))
    .filter(Boolean)
    .map(mapSrdSpellToCharacter)

  if (domainSpells.length === 0) return patch

  return {
    ...patch,
    bonusSpells: [...(patch.bonusSpells ?? []), ...domainSpells],
  }
}
