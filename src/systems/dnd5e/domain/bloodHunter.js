/**
 * Caçador de Sangue (Matt Mercer, 2016) — conteúdo de terceiros, fonte
 * `homebrew`.
 *
 * Fonte única da regra da classe. Puro (sem React): o painel do Ritual
 * Vermelho, `defaultClassFeatureUses` e o motor de ataque leem daqui, então os
 * ids não podem divergir entre card e tracker.
 *
 * Duas mecânicas desta classe não existem no núcleo e por isso vivem aqui:
 * o rito soma um dado de dano NA ARMA IMBUÍDA (não em todo ataque) e reduz o
 * TETO de PV enquanto ativo.
 */

export const BLOOD_HUNTER = 'cacador-de-sangue'

/**
 * Rituais de sangue. `tier` decide onde a escolha é oferecida: Primais no 1º,
 * 6º e 11º níveis; Esotéricos só a partir do 14º.
 *
 * Os tipos usam o vocabulário de dano do app — o PDF escreve "Gelo" e
 * "Relâmpago", que aqui são `frio` e `elétrico`.
 */
export const RITES = {
  chamas:       { name: 'Ritual das Chamas',       damageType: 'fogo',       tier: 'primal' },
  congelamento: { name: 'Ritual do Congelamento',  damageType: 'frio',       tier: 'primal' },
  tempestade:   { name: 'Ritual da Tempestade',    damageType: 'elétrico',   tier: 'primal' },
  rugido:       { name: 'Ritual do Rugido',        damageType: 'trovejante', tier: 'esoteric' },
  eter:         { name: 'Ritual do Éter',          damageType: 'psíquico',   tier: 'esoteric' },
  morto:        { name: 'Ritual do Morto',         damageType: 'necrótico',  tier: 'esoteric' },
}

/** Dado de rito por nível de caçador de sangue (tabela A Caçador de Sangue). */
export function riteDieFor(level) {
  const lv = Number(level) || 0
  if (lv >= 16) return '1d10'
  if (lv >= 11) return '1d8'
  if (lv >= 6)  return '1d6'
  return '1d4'
}

/** Níveis em que uma maldição de sangue é aprendida. */
const CURSE_LEVELS = [2, 5, 9, 13, 16, 20]

/** Quantas maldições de sangue o personagem conhece no nível dado. */
export function bloodCursesKnown(level) {
  const lv = Number(level) || 0
  return CURSE_LEVELS.filter(n => lv >= n).length
}
