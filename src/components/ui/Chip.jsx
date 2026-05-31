/**
 * Chip togglable usado em filtros. Reflete estado via aria-pressed.
 * Tema pergaminho: ativo = ink escuro, inativo = parchment com borda.
 */
export function Chip({ active = false, onClick, children, ariaLabel, className = '', ...rest }) {
  const base = 'inline-flex items-center gap-1 text-[13px] uppercase tracking-wider px-2 py-1 rounded-sm border-2 transition-colors font-display font-semibold'
  const state = active
    ? 'bg-ink-500 text-parchment-50 border-ink-600 shadow-[var(--shadow-parchment-sm)]'
    : 'bg-parchment-50 text-ink-500 border-parchment-600 hover:bg-parchment-200 hover:border-ink-300'
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`${base} ${state} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
