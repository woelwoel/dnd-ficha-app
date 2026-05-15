/**
 * Botão primitivo do redesign. Variants:
 *   primary  — fundo escuro, texto claro (padrão)
 *   ghost    — apenas borda (usado em filtros, ações secundárias)
 *   gold     — gradiente dourado, usado em CTAs heróicos
 *
 * Sempre type="button" por padrão.
 */
const VARIANTS = {
  primary: 'bg-[var(--color-shell-800)] text-[var(--color-ink-inverse)] hover:bg-[var(--color-shell-700)] border border-[var(--color-shell-border)]',
  ghost:   'bg-transparent text-[var(--color-ink-primary)] border border-[var(--color-accent-300)] hover:bg-[var(--color-bg-elevated)]',
  gold:    'bg-gradient-to-b from-[var(--color-gold-400)] to-[var(--color-gold-500)] text-[var(--color-shell-900)] hover:from-[var(--color-gold-500)] hover:to-[var(--color-gold-700)] border border-[var(--color-gold-700)] gold-cta font-semibold shadow-[var(--shadow-card)]',
}

const SIZES = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary
  const s = SIZES[size] || SIZES.md
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded font-[var(--font-redesign-sans)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${v} ${s} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
