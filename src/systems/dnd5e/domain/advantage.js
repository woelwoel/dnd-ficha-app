/**
 * Matriz de vantagem/desvantagem do PHB (p.173): fontes diferentes de
 * vantagem e desvantagem se ANULAM, resultando em rolagem normal. Nada
 * empilha — duas fontes de vantagem continuam sendo uma vantagem.
 *
 * `null` significa "sem opinião": a fonte não se manifesta. Combinar `null`
 * com qualquer coisa devolve a outra.
 *
 * Fonte única da regra. Quem precisa de um DEFAULT ('normal' para o motor de
 * dados) aplica esse default na própria borda — aqui a ausência de opinião
 * continua sendo `null`, porque combinar resultados intermediários exige
 * distinguir "sem opinião" de "explicitamente normal".
 */
export function combineAdvantage(a, b) {
  const na = a === 'adv' || a === 'dis' ? a : null
  const nb = b === 'adv' || b === 'dis' ? b : null
  if (!na) return nb
  if (!nb) return na
  return na === nb ? na : null
}
