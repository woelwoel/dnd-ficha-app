import { SKILLS } from '../../../../../../utils/calculations'

export function RacialSkillPicker({ label, count, chosen, onToggle }) {
  const atLimit = chosen.length >= count
  return (
    <fieldset className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
      <legend className="px-2 text-xs font-display tracking-widest uppercase text-ink-500">
        {label}{' '}
        <span className={atLimit ? 'text-emerald-700' : 'text-amber-700'}>
          ({chosen.length}/{count})
        </span>
        {!atLimit && <span className="text-red-700 ml-1">*</span>}
      </legend>
      <div className="grid grid-cols-2 gap-1 mt-1">
        {SKILLS.map(({ key, name }) => {
          const sel = chosen.includes(key)
          const disabled = !sel && atLimit
          return (
            <button
              key={key}
              type="button"
              onClick={() => !disabled && onToggle(key)}
              className={[
                'flex items-center gap-2 text-left px-2.5 py-1.5 rounded-sm border-2 text-xs transition-colors',
                sel
                  ? 'border-ink-500 bg-parchment-200 text-ink-500'
                  : disabled
                  ? 'border-parchment-600 bg-parchment-50 text-ink-200 opacity-40 cursor-not-allowed'
                  : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
              ].join(' ')}
            >
              <span className={[
                'w-3 h-3 rounded-sm border-2 shrink-0 flex items-center justify-center',
                sel ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
              ].join(' ')}>
                {sel && <span className="text-parchment-50 text-[8px]">✓</span>}
              </span>
              {name}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
