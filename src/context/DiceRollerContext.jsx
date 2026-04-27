import { createContext, useCallback, useContext, useReducer } from 'react'

export const MAX_HISTORY = 30

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1
}

/**
 * Faz o parse e executa uma notação de dados.
 * Suporta: "1d20+5", "2d6", "d8-1", "5" (número puro).
 */
export function parseAndRoll(notation) {
  const n = notation.replace(/\s+/g, '').toLowerCase()

  // Número puro (ex: "+3", "5")
  const flat = n.match(/^([+-]?\d+)$/)
  if (flat) {
    const num = parseInt(flat[1], 10)
    return { notation: n, rolls: [], modifier: num, total: num, sides: null, count: 0 }
  }

  // Notação de dados: [count]d[sides][+/-modifier]
  const match = n.match(/^(\d*)d(\d+)([+-]\d+)?$/)
  if (!match) return null

  const count    = Math.max(1, parseInt(match[1] || '1', 10))
  const sides    = parseInt(match[2], 10)
  const modifier = match[3] ? parseInt(match[3], 10) : 0
  const rolls    = Array.from({ length: count }, () => rollDie(sides))
  const total    = rolls.reduce((a, b) => a + b, 0) + modifier

  return { notation, rolls, modifier, total, sides, count }
}

/* ─────────────────────────────────────────────────────────── */

const DiceRollerContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_ROLL':
      return { ...state, history: [action.entry, ...state.history].slice(0, MAX_HISTORY) }
    case 'CLEAR':
      return { ...state, history: [] }
    case 'TOGGLE':
      return { ...state, open: !state.open }
    case 'OPEN':
      return { ...state, open: true }
    default:
      return state
  }
}

export function DiceRollerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { history: [], open: false })

  const roll = useCallback((notation, label = '') => {
    const result = parseAndRoll(notation)
    if (!result) return null
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label,
      timestamp: Date.now(),
      ...result,
    }
    dispatch({ type: 'ADD_ROLL', entry })
    return entry
  }, [])

  const clearHistory = useCallback(() => dispatch({ type: 'CLEAR' }), [])
  const togglePanel  = useCallback(() => dispatch({ type: 'TOGGLE' }),  [])
  const openPanel    = useCallback(() => dispatch({ type: 'OPEN' }),    [])

  return (
    <DiceRollerContext.Provider value={{ ...state, roll, clearHistory, togglePanel, openPanel }}>
      {children}
    </DiceRollerContext.Provider>
  )
}

export function useDiceRoller() {
  const ctx = useContext(DiceRollerContext)
  if (!ctx) throw new Error('useDiceRoller must be used within DiceRollerProvider')
  return ctx
}
