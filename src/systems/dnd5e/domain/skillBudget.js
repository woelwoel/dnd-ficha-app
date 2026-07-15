/**
 * Quantas perícias o personagem PODE escolher — a regra por trás do contador
 * "N de M escolhidas" da ficha.
 *
 * Por que isso precisa existir: `proficiencies.skills` é um array ACHATADO.
 * O wizard junta ali as perícias da classe, as da raça e as da multiclasse
 * (build-character.js, `skills: [...new Set([...chosenSkills, ...racialSkills,
 * ...mcProfs.skills])]`) e a origem de cada uma se perde. Comparar o tamanho
 * desse array contra `skill_choices.count` (que é SÓ da classe primária) acusa
 * excesso em toda ficha legal de Humano Variante, Meio-Elfo ou multiclasse.
 * Como a origem não é recuperável do personagem salvo, o orçamento é
 * RECONSTRUÍDO a partir de raça/subraça/multiclasses.
 */

/**
 * Perícias EXTRA à escolha concedidas pela raça (PHB).
 * Humano Variante (p.31): "Você ganha proficiência em uma perícia, à sua
 * escolha". Meio-Elfo (p.39), Versatilidade em Perícias: duas.
 */
export function racialSkillCount(race, subrace) {
  if (subrace === 'tracos-raciais-alternativos') return 1
  if (race === 'meio-elfo') return 2
  return 0
}

/**
 * Orçamento total de perícias escolhíveis, ou `null` quando não dá pra
 * afirmar (classe sem `skill_choices`, ou dataset de multiclasse ainda não
 * carregado). `null` = a ficha não mostra contador nem trava checkbox: é
 * preferível ficar calado a acusar excesso errado.
 *
 * @param {object}  classData      classe primária do SRD
 * @param {object}  info           character.info (race, subrace, multiclasses)
 * @param {object}  multiclassData phb-multiclass-pt.json (dataset lazy)
 */
export function skillBudget({ classData, info, multiclassData }) {
  const base = classData?.skill_choices?.count
  if (base == null) return null

  let extra = racialSkillCount(info?.race, info?.subrace)

  for (const mc of info?.multiclasses ?? []) {
    const granted = multiclassData?.[mc.class]?.proficiencies?.skills
    if (granted == null) return null
    extra += granted
  }

  return base + extra
}
