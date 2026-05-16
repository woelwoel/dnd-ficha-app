export function ChosenFeaturePicker({ choice, value, onChange }) {
  const isMulti = !!choice.multiSelect
  const selected = isMulti
    ? (Array.isArray(value) ? value : [])
    : (value ?? '')
  const atLimit = isMulti && selected.length >= choice.multiSelect

  function isSelected(v) {
    return isMulti ? selected.includes(v) : selected === v
  }

  function handleClick(v) {
    if (isMulti) {
      const isSel = selected.includes(v)
      if (isSel) {
        onChange(selected.filter(x => x !== v))
      } else if (selected.length < choice.multiSelect) {
        onChange([...selected, v])
      }
    } else {
      onChange(v)
    }
  }

  return (
    <div className="flex flex-col gap-2 pt-2 border-t-2 border-parchment-600/50">
      <div className="flex items-baseline gap-2">
        <p className="text-xs font-display tracking-widest uppercase text-ink-500">
          {choice.featureName} <span className="text-red-700">*</span>
        </p>
        {isMulti && (
          <span className={[
            'text-[10px] font-display',
            selected.length >= choice.multiSelect ? 'text-emerald-700' : 'text-amber-700',
          ].join(' ')}>
            ({selected.length}/{choice.multiSelect})
          </span>
        )}
      </div>
      {choice.prompt && (
        <p className="text-[11px] italic text-ink-300">{choice.prompt}</p>
      )}
      <div className="flex flex-col gap-1">
        {choice.options.map(opt => {
          const sel = isSelected(opt.value)
          const disabled = isMulti && !sel && atLimit
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => !disabled && handleClick(opt.value)}
              className={[
                'flex items-center gap-2 text-left px-2.5 py-1.5 rounded-sm border-2 text-xs transition-colors',
                sel
                  ? 'border-ink-500 bg-parchment-200 text-ink-500'
                  : disabled
                  ? 'border-parchment-600 bg-parchment-50 text-ink-200 opacity-40 cursor-not-allowed'
                  : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
              ].join(' ')}
            >
              {isMulti ? (
                <span className={[
                  'w-3 h-3 rounded-sm border-2 shrink-0 flex items-center justify-center',
                  sel ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
                ].join(' ')}>
                  {sel && <span className="text-parchment-50 text-[8px]">✓</span>}
                </span>
              ) : (
                <span className={[
                  'w-3 h-3 rounded-full border-2 shrink-0',
                  sel ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
                ].join(' ')} />
              )}
              <span className="font-display flex-1">{opt.name}</span>
              {opt.grants?.bonusCantrips > 0 && (
                <span className="text-[10px] bg-parchment-100 border-2 border-parchment-600 px-1.5 py-0.5 rounded-sm text-ink-300 shrink-0">
                  +{opt.grants.bonusCantrips} truques
                </span>
              )}
              {opt.grants?.spells?.length > 0 && (
                <span className="text-[10px] bg-parchment-100 border-2 border-parchment-600 px-1.5 py-0.5 rounded-sm text-ink-300 shrink-0">
                  +magia
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
