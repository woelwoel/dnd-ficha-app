/* Política de senha — espelha o que o Supabase Auth exige no servidor.
 * Mantemos a checagem aqui pra dar feedback imediato em português, em vez de
 * mandar o usuário no round-trip e devolver o erro cru em inglês. */

export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 50

/* Mesmo conjunto que o Supabase lista no erro `password_requirements`. */
const SYMBOLS = '!@#$%^&*()_+-=[]{};:\'"\\|<>?,./`~'

export const PASSWORD_RULES = [
  { key: 'length', label: `De ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres`, missing: `ter de ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres` },
  { key: 'lower',  label: 'Uma letra minúscula (a-z)',  missing: 'uma letra minúscula' },
  { key: 'upper',  label: 'Uma letra maiúscula (A-Z)',  missing: 'uma letra maiúscula' },
  { key: 'digit',  label: 'Um número (0-9)',            missing: 'um número' },
  { key: 'symbol', label: 'Um símbolo (! @ # $ ...)',   missing: 'um símbolo' },
]

export function passwordChecks(password) {
  const pw = password || ''
  return {
    length: pw.length >= PASSWORD_MIN && pw.length <= PASSWORD_MAX,
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    digit: /[0-9]/.test(pw),
    symbol: [...pw].some(c => SYMBOLS.includes(c)),
  }
}

export function isPasswordValid(password) {
  return Object.values(passwordChecks(password)).every(Boolean)
}

/* Devolve uma frase única com o que ainda falta, ou null se a senha está ok. */
export function describePasswordProblem(password) {
  const checks = passwordChecks(password)
  const faltando = PASSWORD_RULES.filter(r => !checks[r.key]).map(r => r.missing)
  if (faltando.length === 0) return null
  const lista = faltando.length === 1
    ? faltando[0]
    : `${faltando.slice(0, -1).join(', ')} e ${faltando[faltando.length - 1]}`
  return `A senha precisa ${lista}.`
}
