/**
 * Eixo de REGRA da ficha (2014 vs 2024). Fonte única de verdade.
 *
 * IMPORTANTE — a diferença para `domain/sources.js`, que é o inverso disto:
 *
 *   `source`  é ADITIVO      e decide o que é OFERECIDO nos pickers.
 *   `ruleset` é SUBSTITUTIVO e decide QUAL REGRA VALE.
 *
 * Um item de catálogo NUNCA carrega `ruleset` — um talento não é "do 2024",
 * a FICHA é. Catálogos 2024 são arquivos próprios, escolhidos pelo ruleset da
 * ficha.
 *
 * O ruleset é escolhido uma vez na criação e é IMUTÁVEL depois: trocar
 * 2014→2024 numa ficha pronta não é um toggle, é uma conversão (a espécie
 * perde o bônus de atributo, a subclasse muda de nível, os talentos mudam de
 * categoria).
 */

export const RULESETS = {
  '2014': { code: '2014', label: 'D&D 5e (2014)', abbr: '5e' },
  '2024': { code: '2024', label: 'D&D 5e (2024)', abbr: '5e24' },
}

export const DEFAULT_RULESET = '2014'

/** Ruleset da ficha. Ausente, inválido ou ficha legada → '2014'. */
export function rulesetOf(character) {
  const raw = character?.meta?.ruleset
  return typeof raw === 'string' && raw in RULESETS ? raw : DEFAULT_RULESET
}

export function is2024(character) {
  return rulesetOf(character) === '2024'
}

/**
 * Dispatch por ruleset. Exige os DOIS ramos de propósito: quem escreve regra
 * é obrigado a responder "isso muda entre rulesets?" em vez de esquecer o
 * ramo novo em silêncio — a mesma armadilha das listas fechadas que já
 * engoliram conteúdo neste projeto.
 */
export function byRuleset(character, branches) {
  for (const code of Object.keys(RULESETS)) {
    if (!branches || !(code in branches)) {
      throw new Error(`byRuleset: falta o ramo '${code}'`)
    }
  }
  return branches[rulesetOf(character)]
}
