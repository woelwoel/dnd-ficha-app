/**
 * Engine de filtros do Bestiário SRD — funções puras, sem React.
 */

export const EMPTY_MONSTER_FILTERS = Object.freeze({
  cr: { min: 0, max: 30 },
  types: new Set(),
  sizes: new Set(),
  alignments: new Set(),
})

/** Tipos SRD em ordem alfabética (chaves exatas do JSON). */
export const MONSTER_TYPES = [
  'aberration', 'beast', 'celestial', 'construct', 'dragon',
  'elemental', 'fey', 'fiend', 'giant', 'humanoid',
  'monstrosity', 'ooze', 'plant', 'undead',
]

/** Tamanhos SRD em ordem de pequeno → grande. */
export const MONSTER_SIZES = [
  'Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan',
]

/** Alinhamentos exibidos como chips. Casamento é case-insensitive. */
export const ALIGNMENTS = [
  'lawful good', 'neutral good', 'chaotic good',
  'lawful neutral', 'neutral', 'chaotic neutral',
  'lawful evil', 'neutral evil', 'chaotic evil',
  'unaligned',
]

/**
 * Aplica todos os filtros a um monstro.
 * AND entre dimensões; OR dentro de multiselect.
 */
export function matchesMonsterFilters(monster, filters) {
  if (!filters) return true

  const cr = Number(monster.challenge_rating ?? 0)
  if (cr < (filters.cr?.min ?? 0)) return false
  if (cr > (filters.cr?.max ?? 30)) return false

  if (filters.types && filters.types.size > 0) {
    if (!filters.types.has(String(monster.type || '').toLowerCase())) return false
  }

  if (filters.sizes && filters.sizes.size > 0) {
    if (!filters.sizes.has(monster.size)) return false
  }

  if (filters.alignments && filters.alignments.size > 0) {
    const a = String(monster.alignment || '').toLowerCase()
    if (!filters.alignments.has(a)) return false
  }

  return true
}

/** Converte CR numérico para string PHB (1/8, 1/4, 1/2, N). */
export function formatCR(cr) {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25)  return '1/4'
  if (cr === 0.5)   return '1/2'
  return String(cr ?? 0)
}

/** Conta filtros não-default. Usado no badge da UI. */
export function countActiveMonsterFilters(filters) {
  if (!filters) return 0
  let n = 0
  if ((filters.cr?.min ?? 0) > 0)  n += 1
  if ((filters.cr?.max ?? 30) < 30) n += 1
  n += filters.types?.size ?? 0
  n += filters.sizes?.size ?? 0
  n += filters.alignments?.size ?? 0
  return n
}

/** Cor Tailwind de badge por faixa de CR. */
export function crBadgeColor(cr) {
  if (cr <= 1)  return 'bg-gray-700/40 text-gray-300 border-gray-600'
  if (cr <= 4)  return 'bg-green-900/40 text-green-300 border-green-700'
  if (cr <= 10) return 'bg-blue-900/40 text-blue-300 border-blue-700'
  if (cr <= 16) return 'bg-yellow-900/40 text-yellow-300 border-yellow-700'
  return 'bg-red-900/40 text-red-300 border-red-700'
}
