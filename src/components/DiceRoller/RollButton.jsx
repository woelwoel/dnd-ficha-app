import { useDiceRoller } from '../../context/useDiceRoller'

/**
 * Botão compacto 🎲 para disparar uma rolagem e abrir o painel de histórico.
 *
 * Props:
 *  - notation: string  — ex: "1d20+3", "2d6+5"
 *  - label:    string  — nome exibido no histórico (ex: "Atletismo")
 *  - size:     'xs'|'sm' — tamanho do ícone (default 'sm')
 *  - className: string — classes extras
 */
export function RollButton({ notation, label, size = 'sm', className = '' }) {
  const { roll, openPanel } = useDiceRoller()

  function handleClick(e) {
    e.stopPropagation()
    e.preventDefault()
    roll(notation, label)
    openPanel()
  }

  return (
    <button
      onClick={handleClick}
      title={`Rolar ${notation}${label ? ` — ${label}` : ''}`}
      aria-label={`Rolar ${label || notation}`}
      className={`inline-flex items-center justify-center text-gilt-500 hover:text-ink-500 active:scale-95
        transition-all select-none leading-none
        ${size === 'xs' ? 'text-[11px]' : 'text-sm'}
        ${className}`}
    >
      🎲
    </button>
  )
}
