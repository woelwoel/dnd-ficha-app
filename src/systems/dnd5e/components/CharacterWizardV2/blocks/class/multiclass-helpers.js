// Pure helpers for multiclass logic.

const ATTR_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ATTR_LABEL = {
  str: 'FOR', dex: 'DES', con: 'CON',
  int: 'INT', wis: 'SAB', cha: 'CAR',
}

/**
 * Atributos finais = base + raciais. Não inclui ASI (que já estão aplicados em buildCharacter,
 * mas para prereq de multiclasse usamos os valores base+raciais antes de qualquer ASI).
 */
export function totalAttributes(draft) {
  const total = {}
  for (const key of ATTR_KEYS) {
    const base = draft.baseAttributes?.[key] ?? 0
    const bonus = draft.racialBonuses?.[key] ?? 0
    total[key] = base > 0 ? base + bonus : 0
  }
  return total
}

/**
 * prereqs format examples:
 *   { str: 13 }
 *   { str: 13, or: 'dex' }  → ou str OR dex >= 13
 *   { dex: 13, wis: 13 }    → AND
 */
export function meetsPrereqs(prereqs, attrs) {
  if (!prereqs) return true
  const required = Object.entries(prereqs).filter(([k]) => k !== 'or')
  if (required.length === 0) return true

  const orKey = prereqs.or
  if (orKey && required.length === 1) {
    const [k, v] = required[0]
    return (attrs[k] ?? 0) >= v || (attrs[orKey] ?? 0) >= v
  }
  return required.every(([k, v]) => (attrs[k] ?? 0) >= v)
}

export function formatPrereqs(prereqs) {
  if (!prereqs) return ''
  const required = Object.entries(prereqs).filter(([k]) => k !== 'or')
  if (required.length === 0) return 'nenhum'

  const orKey = prereqs.or
  if (orKey && required.length === 1) {
    const [k, v] = required[0]
    return `${ATTR_LABEL[k]} ou ${ATTR_LABEL[orKey]} ≥ ${v}`
  }
  return required.map(([k, v]) => `${ATTR_LABEL[k]} ${v}`).join(', ')
}

export function totalLevels(draft) {
  const primary = draft.level ?? 1
  const extra = (draft.multiclasses ?? []).reduce((s, mc) => s + (mc.level ?? 0), 0)
  return primary + extra
}

export function takenClassIndices(draft) {
  return new Set([
    draft.class,
    ...(draft.multiclasses ?? []).map(mc => mc.class).filter(Boolean),
  ])
}
