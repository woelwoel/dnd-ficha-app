import { DRACONIC_ANCESTORS } from '../../../../../../utils/draconicAncestors'

export function DraconicAncestryPicker({ value, onChange }) {
  return (
    <fieldset className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
      <legend className="px-2 text-xs font-display tracking-widest uppercase text-ink-500">
        Ancestral Dracônico <span className="text-red-700">*</span>
      </legend>
      <p className="text-[13px] italic text-ink-300 mb-2">
        Define seu tipo de dragão, dano de sopro e resistência.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {DRACONIC_ANCESTORS.map(a => {
          const sel = value === a.value
          return (
            <button
              key={a.value}
              type="button"
              onClick={() => onChange(a.value)}
              className={[
                'text-left px-2.5 py-2 rounded-sm border-2 text-xs transition-colors',
                sel
                  ? 'border-ink-500 bg-parchment-200 text-ink-500'
                  : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
              ].join(' ')}
            >
              <span className="font-display block">{a.label}</span>
              <span className="text-xs text-ink-200">{a.damage} · {a.breath} (TR {a.save})</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
