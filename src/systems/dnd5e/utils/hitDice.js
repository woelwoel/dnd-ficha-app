/**
 * Utilitários para o pool de Dados de Vida (schema v2).
 *
 * Schema v2 armazena em `character.combat.hitDice`:
 *   { pool: { d6: { total, used }, d8: { total, used }, ... } }
 *
 * Para compatibilidade, funções aceitam também o formato v1 (string '1d8')
 * retornando o equivalente ao campo mínimo.
 */

/**
 * Normaliza `combat.hitDice` (v1 string ou v2 objeto) em um pool v2.
 * Retorna `{ d8: { total, used } }` como fallback seguro.
 */
export function toHitDicePool(hd) {
  if (hd && typeof hd === 'object' && hd.pool) return hd.pool
  if (typeof hd === 'string') {
    const m = hd.match(/d(\d+)/i)
    const key = m ? `d${m[1]}` : 'd8'
    return { [key]: { total: 1, used: 0 } }
  }
  return { d8: { total: 0, used: 0 } }
}

/**
 * Resume o pool em texto para exibição ("d8: 3/3" ou "d8: 3/3 · d10: 1/1").
 */
export function formatHitDicePool(hd) {
  const pool = toHitDicePool(hd)
  const parts = Object.entries(pool)
    .filter(([, v]) => (v?.total ?? 0) > 0)
    .sort(([a], [b]) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
    .map(([die, v]) => `${die}: ${(v.total - v.used)}/${v.total}`)
  return parts.length ? parts.join(' · ') : '—'
}

/**
 * Total de HD disponíveis (somando todos os dados, independente do tipo).
 */
export function totalHitDiceAvailable(hd) {
  const pool = toHitDicePool(hd)
  return Object.values(pool).reduce((s, v) => s + Math.max(0, (v?.total ?? 0) - (v?.used ?? 0)), 0)
}

/**
 * Reconstrói o pool a partir da classe primária e multiclasses, preservando
 * os valores `used` existentes (até o novo `total`). Útil ao subir de nível.
 *
 * @param {object} character  - personagem com info.class, info.level, info.multiclasses
 * @param {object} classDataMap - { [classIndex]: classData } com `hit_die`
 * @param {object} existingPool - pool atual (para preservar `used`)
 */
export function buildHitDicePool(character, classDataMap, existingPool = {}) {
  const primary = classDataMap?.[character?.info?.class]
  const primaryDie = primary?.hit_die ?? 8
  const primaryLevel = character?.info?.level ?? 1
  const aggregate = {}

  const add = (die, levels) => {
    const key = `d${die}`
    aggregate[key] = (aggregate[key] ?? 0) + levels
  }
  add(primaryDie, primaryLevel)
  for (const mc of character?.info?.multiclasses ?? []) {
    const mcData = classDataMap?.[mc.class]
    add(mcData?.hit_die ?? 8, mc.level ?? 0)
  }

  const pool = {}
  for (const [key, total] of Object.entries(aggregate)) {
    const prevUsed = existingPool?.[key]?.used ?? 0
    pool[key] = { total, used: Math.min(prevUsed, total) }
  }
  return pool
}
