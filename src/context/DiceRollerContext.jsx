import { useCallback, useReducer } from 'react'
import { DiceRollerContext, MAX_HISTORY, parseAndRoll } from './useDiceRoller'

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
