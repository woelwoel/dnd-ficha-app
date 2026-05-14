/**
 * Engine de filtros de magias — função pura `matchesFilters(spell, filters)`
 * + helpers para a UI (labels e contador de filtros ativos).
 *
 * Dimensões suportadas:
 *  - escola              : multiselect via Set<string> (PT-BR minúsculo)
 *  - concentração        : 'any' | 'yes' | 'no'
 *  - ritual              : 'any' | 'yes'   (sem 'no' — ninguém filtra "não-rituais")
 *  - componentes V/S/M   : tri-state cada — 'any' | 'yes' | 'no'
 *  - tempo de conjuração : multiselect via Set<string> com chaves
 *                          'action' | 'bonus' | 'reaction' | 'minutes' | 'hours'
 *
 * Cada dimensão é AND; dentro de multiselect (escolas, tempos) é OR.
 */

/** Estado canônico vazio. Use `{ ...EMPTY_FILTERS, X: Y }` para derivar. */
export const EMPTY_FILTERS = Object.freeze({
  schools: new Set(),
  concentration: 'any',
  ritual: 'any',
  components: { v: 'any', s: 'any', m: 'any' },
  castingTimes: new Set(),
})

/** Labels exibidos para os 5 buckets de casting time. */
export const CASTING_TIME_LABELS = [
  { key: 'action',   label: 'Ação' },
  { key: 'bonus',    label: 'Bônus' },
  { key: 'reaction', label: 'Reação' },
  { key: 'minutes',  label: 'Minutos' },
  { key: 'hours',    label: 'Hora+' },
]

/** Labels PT-BR das 8 escolas de magia. */
export const SCHOOL_LABELS = [
  'abjuração', 'adivinhação', 'conjuração', 'encantamento',
  'evocação',  'ilusão',      'necromancia', 'transmutação',
]

function castingTimeBucket(text) {
  if (!text) return null
  const t = String(text).toLowerCase()
  if (t === '1 ação')           return 'action'
  if (t === '1 ação bônus')     return 'bonus'
  if (t.startsWith('1 reação')) return 'reaction'
  if (t.includes('hora'))       return 'hours'
  if (t.includes('minuto'))     return 'minutes'
  return null
}

/** Detecta componente V/S/M na string "V, S, M" (separadores tolerados). */
function hasComponent(componentsText, letter) {
  if (!componentsText) return false
  const parts = String(componentsText).split(/[,\s]+/).filter(Boolean)
  return parts.includes(letter)
}

function checkComponent(spell, letter, mode) {
  if (mode === 'any') return true
  const present = hasComponent(spell.components, letter)
  return mode === 'yes' ? present : !present
}

/**
 * Aplica todos os filtros a uma magia. AND entre dimensões, OR dentro de
 * multiselect.
 *
 * @param {object} spell    — entrada de phb-spells-pt.json
 * @param {object} filters  — formato EMPTY_FILTERS
 * @returns {boolean}
 */
export function matchesFilters(spell, filters) {
  if (!filters) return true

  // Escola
  if (filters.schools && filters.schools.size > 0) {
    if (!filters.schools.has(String(spell.school || '').toLowerCase())) return false
  }

  // Concentração
  if (filters.concentration === 'yes' && spell.concentration !== true) return false
  if (filters.concentration === 'no'  && spell.concentration === true) return false

  // Ritual
  if (filters.ritual === 'yes' && spell.ritual !== true) return false

  // Componentes
  if (!checkComponent(spell, 'V', filters.components?.v ?? 'any')) return false
  if (!checkComponent(spell, 'S', filters.components?.s ?? 'any')) return false
  if (!checkComponent(spell, 'M', filters.components?.m ?? 'any')) return false

  // Casting times
  if (filters.castingTimes && filters.castingTimes.size > 0) {
    const bucket = castingTimeBucket(spell.casting_time)
    if (!bucket || !filters.castingTimes.has(bucket)) return false
  }

  return true
}

/** Conta filtros ativos (não-default) — usado no badge. */
export function countActiveFilters(filters) {
  if (!filters) return 0
  let n = 0
  n += filters.schools?.size ?? 0
  if (filters.concentration && filters.concentration !== 'any') n += 1
  if (filters.ritual && filters.ritual !== 'any') n += 1
  for (const k of ['v', 's', 'm']) {
    if (filters.components?.[k] && filters.components[k] !== 'any') n += 1
  }
  n += filters.castingTimes?.size ?? 0
  return n
}
