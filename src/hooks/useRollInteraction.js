import { useRef, useState, useEffect } from 'react'
import { useDiceRoller } from './useDiceRoller'

const LONG_PRESS_MS = 500

/**
 * Interação de rolagem compartilhada (fonte única do gesto):
 *   - Click            → rolagem normal
 *   - Shift+Click      → vantagem · Alt+Click → desvantagem
 *   - Long-press ≥500ms→ vantagem (mobile; vibra se suportado)
 * Extraída do RollButton pra qualquer elemento (linha, card) virar gatilho.
 * Retorna { handlers, longPressActive, title } — espalhe `handlers` no elemento.
 */
export function useRollInteraction({ notation, label, crit = false, onAfterRoll, category = null, ability = null }) {
  const { roll } = useDiceRoller()
  const timerRef = useRef(null)
  const longPressedRef = useRef(false)
  const [longPressActive, setLongPressActive] = useState(false)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  function startLongPressTimer() {
    longPressedRef.current = false
    setLongPressActive(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true
      setLongPressActive(true)
      try { navigator.vibrate?.(40) } catch { /* ignore */ }
    }, LONG_PRESS_MS)
  }

  function cancelLongPress() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    startLongPressTimer()
  }

  function handlePointerEnd() {
    cancelLongPress()
    setTimeout(() => setLongPressActive(false), 100)
  }

  function handleClick(e) {
    e.stopPropagation()
    e.preventDefault()
    const opts = { crit }
    if (longPressedRef.current) opts.mode = 'adv'
    else if (e.shiftKey) opts.mode = 'adv'
    else if (e.altKey) opts.mode = 'dis'
    if (category) { opts.category = category; if (ability) opts.ability = ability }
    roll(notation, label, opts)
    onAfterRoll?.()
    longPressedRef.current = false
  }

  const baseTitle = `Rolar ${notation}${label ? ` — ${label}` : ''}`
  const title = crit
    ? `${baseTitle} (dado dobrado — crítico)`
    : `${baseTitle} · Shift+click: vantagem · Alt+click: desvantagem · segurar: vantagem`

  return {
    longPressActive,
    title,
    handlers: {
      onClick: handleClick,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerEnd,
      onPointerLeave: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
      onContextMenu: e => e.preventDefault(),
    },
  }
}
