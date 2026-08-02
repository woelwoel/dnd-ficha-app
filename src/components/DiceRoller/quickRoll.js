/**
 * Regra pura do rolador livre — sem React, sem contexto.
 *
 * Os sete tipos oferecidos são exatamente os que a lib 3D sabe animar
 * (DICE3D_SIDES em dice3d.js): nenhuma rolagem saída daqui cai no fluxo
 * sem animação.
 */
export const QUICK_ROLL_SIDES = [4, 6, 8, 10, 12, 20, 100]

export const MIN_COUNT = 1
export const MAX_COUNT = 20

/** Quantidade sempre inteira dentro de [1, 20]; texto vazio ou lixo vira 1. */
export function clampCount(value) {
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return MIN_COUNT
  return Math.min(MAX_COUNT, Math.max(MIN_COUNT, n))
}

/** Modificador: aceita "", "2", "+2", "-1". Qualquer outra coisa é 0. */
export function parseMod(value) {
  const n = Math.trunc(Number(String(value).trim()))
  return Number.isFinite(n) ? n : 0
}

/** "3d6+2" — formato que o parseAndRoll já entende. */
export function buildNotation({ count, sides, mod = 0 }) {
  const base = `${clampCount(count)}d${sides}`
  if (!mod) return base
  return mod > 0 ? `${base}+${mod}` : `${base}${mod}`
}
