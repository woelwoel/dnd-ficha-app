/**
 * Chip togglable usado em filtros do redesign. Reflete estado via
 * aria-pressed; visual ativo usa gradient dourado.
 */
export function Chip({ active = false, onClick, children, ariaLabel, className = '', ...rest }) {
  const base = 'inline-flex items-center gap-1 text-[11px] uppercase tracking-wider px-2 py-1 rounded border transition-colors font-[var(--font-redesign-sans)] font-semibold'
  const state = active
    ? 'bg-gradient-to-b from-[var(--color-gold-400)] to-[var(--color-gold-500)] text-[var(--color-shell-900)] border-[var(--color-gold-700)]'
    : 'bg-transparent text-[var(--color-gold-400)] border-[var(--color-shell-border)] hover:bg-[rgba(212,173,106,0.08)]'
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
