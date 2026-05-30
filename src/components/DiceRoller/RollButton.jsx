import { useDiceRoller } from '../../hooks/useDiceRoller'
import { Icon } from '../ui/Icon'

/**
 * Botão compacto pra disparar uma rolagem e abrir o painel de histórico.
 *
 * Atalhos (desktop):
 *   - Click            → rolagem normal (ou usa o modo pendente do painel)
 *   - Shift+Click      → força vantagem nesta rolagem
 *   - Alt+Click        → força desvantagem nesta rolagem
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

  function handleClick(e) {
    e.stopPropagation()
    e.preventDefault()
    const opts = { crit }
    if (e.shiftKey) opts.mode = 'adv'
    else if (e.altKey) opts.mode = 'dis'
    roll(notation, label, opts)
    openPanel()
  }

  const baseTitle = `Rolar ${notation}${label ? ` — ${label}` : ''}`
  const title = crit
    ? `${baseTitle} (dado dobrado — crítico)`
    : `${baseTitle} · Shift+click: vantagem · Alt+click: desvantagem`

  return (
    <button
      onClick={handleClick}
      title={title}
      aria-label={`Rolar ${label || notation}`}
      className={`inline-flex items-center justify-center active:scale-95
        transition-all select-none leading-none
        ${crit ? 'text-amber-700 hover:text-amber-900' : 'text-gilt-500 hover:text-ink-500'}
        ${size === 'xs' ? 'text-[13px]' : 'text-sm'}
        ${className}`}
    >
      {icon ?? <Icon name="dice" size={size === 'xs' ? 14 : 16} />}
    </button>
  )
}
