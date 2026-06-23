import { ABILITY_SCORES } from '../../../../../../utils/calculations'

export function FreeAbilityPicker({ label, count, chosen, exclude, onToggle }) {
  const atLimit = chosen.length >= count
  const visible = ABILITY_SCORES.filter(a => a.key !== exclude)

  return (
    <fieldset className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
      <legend className="px-2 text-xs font-display tracking-widest uppercase text-ink-500">
        {label}{' '}
        <span className={atLimit ? 'text-emerald-700' : 'text-amber-700'}>
          ({chosen.length}/{count})
        </span>
        {!atLimit && <span className="text-red-700 ml-1">*</span>}
      </legend>
      <div className="grid grid-cols-3 gap-1.5 mt-1">
        {visible.map(({ key, name, abbr }) => {
          const sel = chosen.includes(key)
          const disabled = !sel && atLimit
          return (
            <button
              key={key}
              type="button"
              onClick={() => !disabled && onToggle(key)}
              className={[
                'px-2 py-2 rounded-sm border-2 text-xs text-center transition-colors',
                sel
                  ? 'border-ink-500 bg-parchment-200 text-ink-500'
                  : disabled
                  ? 'border-parchment-600 bg-parchment-50 text-ink-200 opacity-40 cursor-not-allowed'
                  : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
              ].join(' ')}
            >
              <span className="font-display block">{abbr}</span>
              <span className="text-xs text-ink-200">{name}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
