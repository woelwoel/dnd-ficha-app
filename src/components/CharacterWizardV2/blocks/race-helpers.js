import { ABBR_TO_KEY } from '../../../utils/calculations'

export const MAGO_CANTRIPS = [
  'Amizade', 'Ataque Certeiro', 'Consertar', 'Espirro Ácido',
  'Globos De Luz', 'Ilusão Menor', 'Luz', 'Mensagem',
  'Mãos Mágicas', 'Prestidigitação', 'Proteção Contra Lâminas',
  'Raio De Fogo', 'Raio De Gelo', 'Rajada De Veneno',
  'Toque Arrepiante', 'Toque Chocante',
]

export function computeBonuses(race, subrace, freeChoices) {
  const map = {}
  const all = [
    ...(race?.ability_bonuses ?? []),
    ...(subrace?.ability_bonuses ?? []),
  ]
  for (const b of all) {
    if (b.ability.includes('escolha')) continue
    const key = ABBR_TO_KEY[b.ability]
    if (key) map[key] = (map[key] ?? 0) + b.bonus
  }
  for (const key of (freeChoices ?? [])) {
    map[key] = (map[key] ?? 0) + 1
  }
  return map
}

/**
 * Devolve quais escolhas extras a combinação raça/subraça exige.
 * Independente de objetos do SRD — usa apenas os índices conhecidos.
 */
export function getRaceRequirements(draft, _race, _subrace) {
  const isHumanVariant = draft.subrace === 'tracos-raciais-alternativos'
  const isMeioElfo     = draft.race === 'meio-elfo'
  const isDraconato    = draft.race === 'draconato'
  const isAltoElfo     = draft.subrace === 'alto-elfo'

  return {
    draconicAncestry:   isDraconato,
    highElfCantrip:     isAltoElfo,
    freeAbility:        isHumanVariant ? 2 : isMeioElfo ? 2 : 0,
    freeAbilityExclude: isMeioElfo ? 'cha' : null,
    racialSkills:       isHumanVariant ? 1 : isMeioElfo ? 2 : 0,
  }
}
