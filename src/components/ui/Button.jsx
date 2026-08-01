/**
 * Botão primitivo.
 *
 * As variantes deixaram de carregar utilitários de cor do Tailwind e passaram a
 * apoiar-se nas classes `.ui-btn*` do tokens.css. Motivo: os utilitários
 * parchment atravessam a ponte (legacy-bridge.css), que usa `!important` e
 * achata cores por utilitário — um botão pintado assim não conseguia declarar
 * hierarquia, porque `bg-ink-500` e `bg-parchment-200` chegavam no escuro como
 * a mesma superfície.
 *
 * O default segue sendo `primary`: a hierarquia das telas já estava codificada
 * nos call sites (quem omite `variant` é o CTA — "Próximo turno", "Rodar
 * combate", "Rolar iniciativa"), ela só não aparecia porque `bg-ink-500` e
 * `border-parchment-600` chegavam no escuro como a mesma superfície.
 *
 * Variants:
 *   primary     — ação principal da tela (dourado no site, acento na ficha)
 *   gold        — apelido histórico de `primary` (CTAs heróicos)
 *   ghost       — secundário: superfície + borda
 *   ghost-dark  — idem; nome mantido pelos call sites do Mapa
 *   danger      — ação destrutiva: discreta em repouso, explícita no hover
 *   selected    — lado ligado de um par de alternância (Mapa/Lista)
 *   quiet       — navegação em forma de texto, sem caixa
 *
 * `type="button"` por padrão (evita submit acidental em forms).
 */
const VARIANTS = {
  ghost:        'ui-btn',
  'ghost-dark': 'ui-btn',
  primary:      'ui-btn ui-btn--primary',
  gold:         'ui-btn ui-btn--primary',
  danger:       'ui-btn ui-btn--danger',
  selected:     'ui-btn ui-btn--selected',
  quiet:        'ui-btn--quiet',
}

const SIZES = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-5 py-2.5',
}

/* `quiet` não é caixa: herdar o padding do tamanho abriria um vão de clique
   grande em volta de um link de texto. Fica só com o corpo da fonte. */
const QUIET_SIZES = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.primary
  const sizes = variant === 'quiet' ? QUIET_SIZES : SIZES
  const s = sizes[size] || sizes.md
  return (
    <button
      type={type}
      className={`font-display tracking-wide ${v} ${s} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
