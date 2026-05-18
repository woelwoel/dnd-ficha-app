import { useCallback, useReducer } from 'react'
import { DiceRollerContext, MAX_HISTORY, parseAndRoll } from '../hooks/useDiceRoller'

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
    case 'SET_MODE':
      return { ...state, mode: action.mode }
    default:
      return state
  }
}

export function DiceRollerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { history: [], open: false, mode: 'normal' })

  /**
   * Dispara uma rolagem. Aceita override por opts.mode/opts.crit; caso
   * contrário, usa o `mode` pendente do contexto (toggle de vantagem/
   * desvantagem). Após a rolagem o modo pendente reseta para 'normal'
   * (intencional: "armar próxima rolagem" não é estado persistente).
   */
  const roll = useCallback((notation, label = '', opts = {}) => {
    const effectiveMode = opts.mode ?? state.mode ?? 'normal'
    const result = parseAndRoll(notation, { mode: effectiveMode, crit: !!opts.crit })
    if (!result) return null
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      label,
      timestamp: Date.now(),
      ...result,
    }
    dispatch({ type: 'ADD_ROLL', entry })
    if (state.mode !== 'normal' && !opts.mode) {
      dispatch({ type: 'SET_MODE', mode: 'normal' })
    }
    return entry
  }, [state.mode])

  const clearHistory = useCallback(() => dispatch({ type: 'CLEAR' }), [])
  const togglePanel  = useCallback(() => dispatch({ type: 'TOGGLE' }),  [])
  const openPanel    = useCallback(() => dispatch({ type: 'OPEN' }),    [])
  const setMode      = useCallback(mode => dispatch({ type: 'SET_MODE', mode }), [])

  return (
    <DiceRollerContext.Provider value={{ ...state, roll, clearHistory, togglePanel, openPanel, setMode }}>
      {children}
    </DiceRollerContext.Provider>
  )
}
