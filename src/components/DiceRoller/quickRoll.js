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

/**
 * O que pode SER DIGITADO em cada campo. Não é validação de valor — é o filtro
 * de tecla, aplicado antes do estado; `clampCount`/`parseMod` seguem cuidando
 * do valor final.
 *
 * Existe porque `Number()` aceita notação exponencial: "1e9" cabe nos três
 * caracteres do campo de modificador e produzia uma rolagem real de
 * 20d100+1000000000 no histórico. Filtrar na entrada resolve na origem sem
 * mexer em `parseMod`, que é puro e também roda sobre o localStorage.
 */
export const COUNT_INPUT_RE = /^\d*$/
export const MOD_INPUT_RE = /^[+-]?\d*$/

/** Modificador: aceita "", "2", "+2", "-1". Qualquer outra coisa é 0. */
export function parseMod(value) {
  const n = Math.trunc(Number(String(value).trim()))
  return Number.isFinite(n) ? n : 0
}

/**
 * "3d6+2" — formato que o parseAndRoll já entende.
 *
 * `mod` passa por `parseMod` antes de tudo: aceita número ou string
 * (inclusive "0" como string, que é truthy e não pode furar o guard).
 */
export function buildNotation({ count, sides, mod = 0 }) {
  const m = parseMod(mod)
  const base = `${clampCount(count)}d${sides}`
  if (!m) return base
  return m > 0 ? `${base}+${m}` : `${base}${m}`
}

export const QUICK_ROLL_KEY = 'dnd-ficha:quickroll'

const DEFAULTS = { sides: 20, count: MIN_COUNT, mod: 0 }

/**
 * Última escolha do usuário. Nunca confia no que está guardado: valor
 * corrompido, lado desconhecido ou quantidade fora da faixa caem no padrão —
 * mesmo tratamento das outras chaves do app (dnd-ficha:dice3d, :fab-dice).
 */
export function readQuickRollPref() {
  try {
    const raw = window.localStorage.getItem(QUICK_ROLL_KEY)
    if (!raw) return { ...DEFAULTS }
    const saved = JSON.parse(raw)
    return {
      sides: QUICK_ROLL_SIDES.includes(saved?.sides) ? saved.sides : DEFAULTS.sides,
      count: clampCount(saved?.count),
      mod: parseMod(saved?.mod ?? 0),
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writeQuickRollPref({ sides, count, mod }) {
  try {
    window.localStorage.setItem(QUICK_ROLL_KEY, JSON.stringify({ sides, count, mod }))
  } catch { /* storage indisponível — a preferência é conveniência, não estado */ }
}
