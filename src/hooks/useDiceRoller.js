import { createContext, useContext } from 'react'

export const MAX_HISTORY = 30

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1
}

/**
 * Faz o parse e executa uma notação de dados.
 * Suporta: "1d20+5", "2d6", "d8-1", "5" (número puro), e multi-termo
 * com riders de dado: "1d20+1d4+5" (ex.: bênção/feitiço somando dado extra).
 *
 * Opções:
 *   - mode: 'normal' | 'adv' | 'dis'
 *           Quando 'adv'/'dis' E o PRIMEIRO grupo for um único d20, rola
 *           DOIS d20 e mantém o maior (adv) ou o menor (dis). Em qualquer
 *           outro caso (2d6, 1d8, etc.) o modo é ignorado. Riders (grupos
 *           seguintes) nunca são afetados por adv/dis.
 *   - crit: boolean
 *           Quando true, DOBRA a quantidade de dados rolados em TODOS os
 *           grupos (regra de dano crítico, PHB p.196). Aplica só em
 *           rolagens de dado (não em modificador puro).
 *
 * Shape de retorno (compat total com o histórico de um termo):
 *   { notation, rolls, sides, count, modifier, total, mode,
 *     allRolls?, keptIndex?, crit?, groups }
 * `rolls`/`sides`/`count`/`allRolls`/`keptIndex` sempre refletem o
 * PRIMEIRO grupo (nat 20/1, painel, dados 3D continuam funcionando sem
 * mudança). `groups` (aditivo) lista TODOS os grupos rolados. `modifier`
 * soma os flats; `total` soma tudo (todos os grupos + modifier).
 */
export function parseAndRoll(notation, opts = {}) {
  const { mode = 'normal', crit = false } = opts
  const n = String(notation).replace(/\s+/g, '').toLowerCase()

  // Número puro (ex: "+3", "5") — comportamento idêntico ao histórico.
  const flat = n.match(/^([+-]?\d+)$/)
  if (flat) {
    const num = parseInt(flat[1], 10)
    return { notation: n, rolls: [], modifier: num, total: num, sides: null, count: 0, mode: 'normal' }
  }

  // Multi-termo: primeiro termo é dado; termos seguintes são +dado ou ±flat.
  // Ex.: "1d20+1d4+5", "2d6+3", "d8-1". (Riders são sempre positivos.)
  if (!/^\d*d\d+(?:[+-]\d+|\+\d*d\d+)*$/.test(n)) return null
  const terms = n.match(/^\d*d\d+|[+-]\d*d\d+|[+-]\d+/g)

  const groups = []
  let modifier = 0
  for (const t of terms) {
    const dice = t.match(/^([+-]?)(\d*)d(\d+)$/)
    if (dice) {
      groups.push({
        count: Math.max(1, parseInt(dice[2] || '1', 10)),
        sides: parseInt(dice[3], 10),
      })
    } else {
      modifier += parseInt(t, 10)
    }
  }

  const primary = groups[0]
  const isAdvEligible = (mode === 'adv' || mode === 'dis')
    && primary.sides === 20 && primary.count === 1 && !crit

  let allRolls = null
  let keptIndex = null
  if (isAdvEligible) {
    // Vantagem/Desvantagem: APENAS o d20 principal rola duplo (PHB p.173).
    const a = rollDie(20)
    const b = rollDie(20)
    const kept = mode === 'adv' ? Math.max(a, b) : Math.min(a, b)
    primary.rolls = [kept]
    allRolls = [a, b]
    keptIndex = kept === a ? 0 : 1
  } else {
    const effCount = crit ? primary.count * 2 : primary.count
    primary.rolls = Array.from({ length: effCount }, () => rollDie(primary.sides))
    primary.count = effCount
  }

  for (const g of groups.slice(1)) {
    const effCount = crit ? g.count * 2 : g.count
    g.rolls = Array.from({ length: effCount }, () => rollDie(g.sides))
    g.count = effCount
  }

  const total = groups.reduce((s, g) => s + g.rolls.reduce((a, b) => a + b, 0), 0) + modifier

  return {
    notation,
    // Compat: o shape histórico espelha o PRIMEIRO grupo (nat 20/1, painel, 3D).
    rolls: primary.rolls,
    sides: primary.sides,
    count: primary.count,
    ...(allRolls ? { allRolls, keptIndex } : {}),
    groups: groups.map(g => ({ sides: g.sides, rolls: g.rolls })),
    modifier,
    total,
    mode: isAdvEligible ? mode : 'normal',
    ...(crit ? { crit } : {}),
  }
}

export const DiceRollerContext = createContext(null)

export function useDiceRoller() {
  const ctx = useContext(DiceRollerContext)
  if (!ctx) throw new Error('useDiceRoller must be used within DiceRollerProvider')
  return ctx
}
