import { fixedRacialBonuses } from '../../../systems/dnd5e/domain/racialBonuses'

export const MAGO_CANTRIPS = [
  'Amizade', 'Ataque Certeiro', 'Consertar', 'Espirro Ácido',
  'Globos De Luz', 'Ilusão Menor', 'Luz', 'Mensagem',
  'Mãos Mágicas', 'Prestidigitação', 'Proteção Contra Lâminas',
  'Raio De Fogo', 'Raio De Gelo', 'Rajada De Veneno',
  'Toque Arrepiante', 'Toque Chocante',
]

export function computeBonuses(race, subrace, freeChoices) {
  const map = fixedRacialBonuses(race, subrace)
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
    racialFeat:         isHumanVariant,
  }
}
