import { useRef, useState, useEffect } from 'react'
import { useDiceRoller } from '../../hooks/useDiceRoller'
import { Icon } from '../ui/Icon'

const LONG_PRESS_MS = 500

/**
 * Botão compacto pra disparar uma rolagem e abrir o painel de histórico.
 *
 * Atalhos:
 *   - Click               → rolagem normal (ou usa o modo pendente do painel)
 *   - Shift+Click  (desktop) → vantagem
 *   - Alt+Click    (desktop) → desvantagem
 *   - Long-press (≥500ms)    → vantagem (mobile-friendly; vibra se suportado)
 *
 * Pra desvantagem no mobile, usar o seletor "Próxima: Normal/Vant/Desv"
 * no painel de histórico (que persiste até a próxima rolagem).
 *
 * Props:
 *  - notation: string  — ex: "1d20+3", "2d6+5"
 *  - label:    string  — nome exibido no histórico (ex: "Atletismo")
 *  - size:     'xs'|'sm' — tamanho do ícone (default 'sm')
 *  - className: string — classes extras
 *  - icon:     string | ReactNode — sobrescreve o glifo padrão (raro)
 */
export function RollButton({ notation, label, size = 'sm', className = '', crit = false, icon }) {
  const { roll, openPanel } = useDiceRoller()
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
      // Vibração curta como feedback háptico (mobile) — silently no-op
      // em browsers/desktops sem suporte.
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
    // Limpa o highlight visual no próximo tick pra não piscar antes do click
    setTimeout(() => setLongPressActive(false), 100)
  }

  function handleClick(e) {
    e.stopPropagation()
    e.preventDefault()
    const opts = { crit }
    if (longPressedRef.current) opts.mode = 'adv'
    else if (e.shiftKey) opts.mode = 'adv'
    else if (e.altKey) opts.mode = 'dis'
    roll(notation, label, opts)
    openPanel()
    longPressedRef.current = false
  }

  const baseTitle = `Rolar ${notation}${label ? ` — ${label}` : ''}`
  const title = crit
    ? `${baseTitle} (dado dobrado — crítico)`
    : `${baseTitle} · Shift+click: vantagem · Alt+click: desvantagem · segurar: vantagem`

  return (
    <button
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onContextMenu={e => e.preventDefault()}
      title={title}
      aria-label={`Rolar ${label || notation}`}
      className={[
        'inline-flex items-center justify-center active:scale-95',
        'transition-all select-none leading-none touch-none',
        crit ? 'text-amber-700 hover:text-amber-900' : 'text-gilt-500 hover:text-ink-500',
        size === 'xs' ? 'text-[13px]' : 'text-sm',
        longPressActive ? 'scale-125 !text-emerald-700' : '',
        className,
      ].join(' ')}
    >
      {icon ?? <Icon name="dice" size={size === 'xs' ? 14 : 16} />}
    </button>
  )
}
