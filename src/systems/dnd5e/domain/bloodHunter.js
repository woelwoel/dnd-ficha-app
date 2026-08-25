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

/** Modificador de atributo (PHB p.13). Local para não importar `rules.js`. */
function modOf(score) {
  return Math.floor(((Number(score) || 10) - 10) / 2)
}

/** Nível TOTAL de personagem = classe principal + todas as multiclasses. */
function characterLevel(character) {
  const base = Number(character?.info?.level) || 0
  const extra = (character?.info?.multiclasses ?? [])
    .reduce((sum, mc) => sum + (Number(mc?.level) || 0), 0)
  return base + extra
}

/**
 * Nível de caçador de sangue, seja como classe principal ou multiclasse.
 * O campo é `info.class` — `classIndex` não existe no schema da ficha.
 */
export function bloodHunterLevel(character) {
  if (character?.info?.class === BLOOD_HUNTER) return Number(character.info.level) || 0
  const mc = (character?.info?.multiclasses ?? []).find(m => m?.class === BLOOD_HUNTER)
  return Number(mc?.level) || 0
}

/** Bônus de proficiência pelo nível de personagem (PHB p.15). */
function proficiencyBonus(character) {
  return Math.floor((Math.max(1, characterLevel(character)) - 1) / 4) + 2
}

/**
 * CD das maldições de sangue = 8 + proficiência + modificador de Sabedoria.
 * A chave é `wis` — é assim que `characterSchema` grava os atributos.
 */
export function hemocraftDC(character) {
  return 8 + proficiencyBonus(character) + modOf(character?.attributes?.wis)
}

/** Ritos ativos, descartando entradas sem arma ou com rito desconhecido. */
export function activeRites(character) {
  return (character?.combat?.crimsonRites ?? [])
    .filter(r => r && typeof r.attackId === 'string' && r.attackId && RITES[r.rite])
    .map(r => ({ attackId: r.attackId, rite: r.rite }))
}

/**
 * Redução do teto de PV: nível de PERSONAGEM por rito ativo.
 * Maestria Sanguínea (20º de classe) remove o sacrifício.
 */
export function bloodHunterMaxHpPenalty(character) {
  if (bloodHunterLevel(character) >= 20) return 0
  return activeRites(character).length * characterLevel(character)
}

/** Dado e tipo de dano do rito ativo NESTA arma, ou null. */
export function riteDamageFor(attack, character) {
  const found = activeRites(character).find(r => r.attackId === attack?.id)
  if (!found) return null
  return { dice: riteDieFor(bloodHunterLevel(character)), damageType: RITES[found.rite].damageType }
}
