import { useRollInteraction } from '../../../../../hooks/useRollInteraction'

/**
 * Linha rolável do v2 (estilo D&D Beyond): a linha INTEIRA é um <button> que
 * rola `notation`. Gesto de vantagem/desvantagem herdado do useRollInteraction.
 */
export function RollableRow({ notation, label, ariaLabel, children, category = null, ability = null }) {
  const { handlers, longPressActive, title } = useRollInteraction({ notation, label, category, ability })
  return (
    <button
      type="button"
      {...handlers}
      title={title}
      aria-label={ariaLabel ?? `Rolar ${label}`}
      className={`v2-row v2-rollable${longPressActive ? ' v2-rollable-armed' : ''}`}
    >
      {children}
    </button>
  )
}
