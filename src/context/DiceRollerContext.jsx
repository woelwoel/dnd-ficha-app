import { useCallback, useEffect, useReducer } from 'react'
import { DiceRollerContext, MAX_HISTORY, parseAndRoll } from '../hooks/useDiceRoller'
import {
  DICE3D_SIDES, enqueueDice3d, isDice3dSupported, preloadDice3d, setDice3dAccent,
} from '../components/DiceRoller/dice3d'

const DICE3D_KEY = 'dnd-ficha:dice3d'

function readDice3dPref() {
  try { return window.localStorage.getItem(DICE3D_KEY) !== 'off' } catch { return true }
}

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
    case 'SET_DICE3D':
      return { ...state, dice3d: action.enabled }
    default:
      return state
  }
}

export function DiceRollerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, {
    history: [], open: false, mode: 'normal', dice3d: readDice3dPref(),
  })

  // Pré-carrega o chunk 3D em idle — a primeira rolagem não paga o import.
  useEffect(() => {
    if (state.dice3d && isDice3dSupported()) preloadDice3d()
  }, [state.dice3d])

  /**
   * Dispara uma rolagem. O resultado é calculado SINCRONAMENTE (parseAndRoll)
   * e retornado na hora — quem chama pode ler total/rolls (AttackRollButton
   * detecta 20/1 natural pelo retorno). A APRESENTAÇÃO é decidida aqui:
   *   - 3D ativo: a entrada segura até os dados 3D pararem; painel não abre.
   *   - clássico: entrada imediata + painel abre.
   * Aceita override por opts.mode/opts.crit; caso contrário usa o `mode`
   * pendente do contexto, que reseta pra 'normal' após a rolagem.
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
    if (state.mode !== 'normal' && !opts.mode) {
      dispatch({ type: 'SET_MODE', mode: 'normal' })
    }

    // Em vantagem/desvantagem anima os DOIS d20 (o histórico mostra qual valeu).
    const values = result.allRolls ?? result.rolls
    const use3d = state.dice3d && values.length > 0 &&
      DICE3D_SIDES.has(result.sides) && isDice3dSupported()

    if (use3d) {
      enqueueDice3d({ sides: result.sides, values, label, total: result.total })
        .then(({ animated }) => {
          dispatch({ type: 'ADD_ROLL', entry })
          if (!animated) dispatch({ type: 'OPEN' })
        })
    } else {
      dispatch({ type: 'ADD_ROLL', entry })
      dispatch({ type: 'OPEN' })
    }
    return entry
  }, [state.mode, state.dice3d])

  const setDice3d = useCallback(enabled => {
    try { window.localStorage.setItem(DICE3D_KEY, enabled ? 'on' : 'off') } catch { /* ignore */ }
    dispatch({ type: 'SET_DICE3D', enabled })
  }, [])

  const clearHistory = useCallback(() => dispatch({ type: 'CLEAR' }), [])
  const togglePanel  = useCallback(() => dispatch({ type: 'TOGGLE' }),  [])
  const openPanel    = useCallback(() => dispatch({ type: 'OPEN' }),    [])
  const setMode      = useCallback(mode => dispatch({ type: 'SET_MODE', mode }), [])

  return (
    <DiceRollerContext.Provider value={{
      ...state, roll, clearHistory, togglePanel, openPanel, setMode,
      setDice3d, setDiceAccent: setDice3dAccent,
    }}>
      {children}
    </DiceRollerContext.Provider>
  )
}
