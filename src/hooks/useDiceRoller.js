import { createContext, useContext } from 'react'

export const MAX_HISTORY = 30

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1
}

/**
 * Faz o parse e executa uma notação de dados.
 * Suporta: "1d20+5", "2d6", "d8-1", "5" (número puro).
 *
 * Opções:
 *   - mode: 'normal' | 'adv' | 'dis'
 *           Quando 'adv'/'dis' E for uma rolagem de UM único d20, rola
 *           DOIS d20 e mantém o maior (adv) ou o menor (dis). Em qualquer
 *           outro caso (2d6, 1d8, etc.) o modo é ignorado.
 *   - crit: boolean
 *           Quando true, DOBRA a quantidade de dados rolados (regra de
 *           dano crítico, PHB p.196). Aplica só em rolagens de dado (não
 *           em modificador puro).
 */
export function parseAndRoll(notation, opts = {}) {
  const { mode = 'normal', crit = false } = opts
  const n = notation.replace(/\s+/g, '').toLowerCase()

  // Número puro (ex: "+3", "5")
  const flat = n.match(/^([+-]?\d+)$/)
  if (flat) {
    const num = parseInt(flat[1], 10)
    return { notation: n, rolls: [], modifier: num, total: num, sides: null, count: 0, mode: 'normal' }
  }

  // Notação de dados: [count]d[sides][+/-modifier]
  const match = n.match(/^(\d*)d(\d+)([+-]\d+)?$/)
  if (!match) return null

  const baseCount = Math.max(1, parseInt(match[1] || '1', 10))
  const sides     = parseInt(match[2], 10)
  const modifier  = match[3] ? parseInt(match[3], 10) : 0

  // Vantagem/Desvantagem: aplica APENAS em 1d20 (regra PHB p.173).
  if ((mode === 'adv' || mode === 'dis') && sides === 20 && baseCount === 1) {
    const a = rollDie(20)
    const b = rollDie(20)
    const kept = mode === 'adv' ? Math.max(a, b) : Math.min(a, b)
    const total = kept + modifier
    return {
      notation,
      rolls: [kept],            // mantido (para detecção de crit/fumble)
      allRolls: [a, b],         // ambos os dados (UI exibe os dois, risca o descartado)
      keptIndex: kept === a ? 0 : 1,
      modifier,
      total,
      sides,
      count: 1,
      mode,
    }
  }

  // Crítico: dobra a quantidade de dados rolados (sem dobrar o modificador).
  const effCount = crit ? baseCount * 2 : baseCount
  const rolls    = Array.from({ length: effCount }, () => rollDie(sides))
  const total    = rolls.reduce((a, b) => a + b, 0) + modifier

  return { notation, rolls, modifier, total, sides, count: effCount, mode: 'normal', crit }
}

export const DiceRollerContext = createContext(null)

export function useDiceRoller() {
  const ctx = useContext(DiceRollerContext)
  if (!ctx) throw new Error('useDiceRoller must be used within DiceRollerProvider')
  return ctx
}
