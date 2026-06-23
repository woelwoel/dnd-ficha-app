const STATUS_BADGE = {
  completo:   { icon: '✓',  cls: 'bg-emerald-700 text-parchment-50 border-emerald-800' },
  parcial:    { icon: '●',  cls: 'bg-amber-500 text-parchment-50 border-amber-700' },
  vazio:      { icon: '○',  cls: 'bg-parchment-200 text-ink-300 border-parchment-600' },
  bloqueado:  { icon: '🔒', cls: 'bg-parchment-200 text-ink-200 border-parchment-600' },
}

const STATUS_ACCENT = {
  completo:  'border-emerald-700/70 bg-gradient-to-br from-parchment-50 to-emerald-50/40',
  parcial:   'border-amber-600/70 bg-gradient-to-br from-parchment-50 to-amber-50/40',
  vazio:     'border-parchment-600 bg-parchment-50',
  bloqueado: 'border-parchment-600 bg-parchment-100/40',
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

export function BlockCard({
  label, status, summary, onClick,
  blockedBy = [], dataTestId,
  icon, step, hint,
}) {
  const isBlocked = status === 'bloqueado'
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.vazio
  const title = isBlocked && blockedBy.length
    ? `Preencha ${blockedBy.join(', ')} primeiro`
    : undefined

  // Resumo a ser mostrado: se vazio e não bloqueado, usar hint; se bloqueado, frase neutra.
  // Atenção: a frase de bloqueio NÃO deve conter o nome do bloco dependente —
  // isso quebra `getByRole('button', { name: /<label>/ })` no card original.
  // O tooltip (title) já lista as dependências.
  const displayText = (() => {
    if (isBlocked) return 'aguardando passos anteriores'
    if (status === 'vazio' && hint) return hint
    return summary
  })()

  return (
    <button
      type="button"
      data-testid={dataTestId}
      title={title}
      aria-disabled={isBlocked}
      onClick={isBlocked ? undefined : onClick}
      className={[
        'group relative flex flex-col gap-2 p-4 pl-5 text-left rounded-sm border-2 transition-all duration-200',
        STATUS_ACCENT[status] ?? STATUS_ACCENT.vazio,
        isBlocked
          ? 'opacity-60 cursor-not-allowed'
          : 'shadow-parchment hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-lg cursor-pointer',
      ].join(' ')}
    >
      {/* Faixa lateral colorida indicando status */}
      <span
        aria-hidden
        className={[
          'absolute left-0 top-2 bottom-2 w-1 rounded-r-sm transition-colors',
          status === 'completo' ? 'bg-emerald-700/70'
            : status === 'parcial' ? 'bg-amber-500/80'
            : 'bg-parchment-600/30',
        ].join(' ')}
      />

      {/* Linha superior: numeral romano, ícone temático e badge de status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {step != null && (
            <span
              aria-hidden
              className="text-xs font-display tracking-widest text-ink-300 leading-none pt-0.5"
            >
              {ROMAN[step] ?? step + 1}
            </span>
          )}
          <span
            aria-hidden
            className={[
              'text-2xl leading-none transition-transform',
              isBlocked ? 'text-parchment-600' : 'text-ink-400 group-hover:scale-110',
            ].join(' ')}
          >
            {icon}
          </span>
        </div>
        <span className={[
          'shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border-2',
          badge.cls,
        ].join(' ')}>
          {badge.icon}
        </span>
      </div>

      {/* Label */}
      <span className="text-xs font-display tracking-widest uppercase text-ink-500">
        {label}
      </span>

      {/* Resumo / hint / mensagem de bloqueio */}
      <div className={[
        'text-sm font-display',
        status === 'completo' ? 'text-ink-500' : 'text-ink-300 italic',
      ].join(' ')}>
        {displayText}
      </div>
    </button>
  )
}
