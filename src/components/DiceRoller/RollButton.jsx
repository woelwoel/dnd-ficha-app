import { useRollInteraction } from '../../hooks/useRollInteraction'
import { Icon } from '../ui/Icon'

/**
 * Botão compacto pra disparar uma rolagem e abrir o painel de histórico.
 * Gesto (click/Shift/Alt/long-press) vive em useRollInteraction — fonte única.
 *
 * Props:
 *  - notation: string  — ex: "1d20+3", "2d6+5"
 *  - label:    string  — nome exibido no histórico (ex: "Atletismo")
 *  - size:     'xs'|'sm' — tamanho do ícone (default 'sm')
 *  - className: string — classes extras
 *  - icon:     string | ReactNode — sobrescreve o glifo padrão (raro)
 */
export function RollButton({ notation, label, size = 'sm', className = '', crit = false, icon }) {
  const { handlers, longPressActive, title } = useRollInteraction({ notation, label, crit })
  return (
    <button
      {...handlers}
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
