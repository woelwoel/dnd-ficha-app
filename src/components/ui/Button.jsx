/**
 * Botão primitivo (tema pergaminho).
 *
 * Variants:
 *   primary     — bg ink, texto pergaminho (CTAs principais)
 *   ghost       — borda parchment + texto ink (botões secundários em fundo claro)
 *   ghost-dark  — borda dourada + texto dourado (mantido pra contextos
 *                 escuros do Mapa — sidebar/banner com fundo shell)
 *   gold        — dourado heróico (CTAs como "Recrutar", "Salvar Herói")
 *
 * `type="button"` por padrão (evita submit acidental em forms).
 */
const VARIANTS = {
  primary:      'bg-ink-500 hover:bg-ink-600 text-parchment-50 border-2 border-ink-600 shadow-[var(--shadow-parchment-sm)]',
  ghost:        'bg-transparent text-ink-500 border-2 border-parchment-600 hover:bg-parchment-200 hover:border-ink-300',
  'ghost-dark': 'bg-transparent text-[var(--color-gold-400)] border border-[var(--color-shell-border)] hover:bg-[rgba(212,173,106,0.10)]',
  gold:         'bg-gradient-to-b from-amber-300 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-ink-500 border-2 border-amber-700 font-semibold shadow-[var(--shadow-parchment-sm)]',
}

const SIZES = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-5 py-2.5',
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
      className={`inline-flex items-center justify-center gap-2 rounded-sm font-display tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${v} ${s} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
