const STATUS_BADGE = {
  completo:   { icon: '✓',  cls: 'bg-emerald-700 text-parchment-50 border-emerald-800' },
  parcial:    { icon: '●',  cls: 'bg-amber-500 text-parchment-50 border-amber-700' },
  vazio:      { icon: '○',  cls: 'bg-parchment-200 text-ink-300 border-parchment-600' },
  bloqueado:  { icon: '🔒', cls: 'bg-parchment-200 text-ink-200 border-parchment-600' },
}

export function BlockCard({ label, status, summary, onClick, blockedBy = [], dataTestId }) {
  const isBlocked = status === 'bloqueado'
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.vazio
  const title = isBlocked && blockedBy.length
    ? `Preencha ${blockedBy.join(', ')} primeiro`
    : undefined

  return (
    <button
      type="button"
      data-testid={dataTestId}
      title={title}
      aria-disabled={isBlocked}
      onClick={isBlocked ? undefined : onClick}
      className={[
        'flex flex-col gap-2 p-4 text-left rounded-sm border-2 transition-all duration-150',
        'bg-parchment-50 border-parchment-600',
        isBlocked
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:border-ink-300 hover:shadow-md cursor-pointer',
      ].join(' ')}
      style={{ boxShadow: isBlocked ? 'none' : 'var(--shadow-parchment)' }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-display tracking-widest uppercase text-ink-500">
          {label}
        </span>
        <span className={[
          'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2',
          badge.cls,
        ].join(' ')}>
          {badge.icon}
        </span>
      </div>
      <div className={[
        'text-sm font-display',
        status === 'completo' ? 'text-ink-500' : 'text-ink-300 italic',
      ].join(' ')}>
        {summary}
      </div>
    </button>
  )
}
