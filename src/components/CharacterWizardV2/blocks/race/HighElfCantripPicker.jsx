import { MAGO_CANTRIPS } from '../race-helpers'

const fieldCls =
  'w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 ' +
  'focus:outline-none focus:border-ink-300'

export function HighElfCantripPicker({ value, onChange }) {
  return (
    <fieldset className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
      <legend className="px-2 text-xs font-display tracking-widest uppercase text-ink-500">
        Truque de Mago <span className="text-red-700">*</span>
      </legend>
      <p className="text-[11px] italic text-ink-300 mb-2">
        Você conhece 1 truque do Mago (Inteligência como atributo de conjuração).
      </p>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className={fieldCls}
      >
        <option value="">Escolher truque...</option>
        {MAGO_CANTRIPS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </fieldset>
  )
}
