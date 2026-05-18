// src/components/CharacterWizardV2/blocks/attributes/StandardArrayUI.jsx
import { ABILITY_SCORES, STANDARD_ARRAY, getModifier, formatModifier } from '../../../../utils/calculations'
import { finalScore, availableStandardArray } from './attribute-helpers'

export function StandardArrayUI({ draft, updateDraft }) {
  const baseAttrs = draft.baseAttributes
  const racialBonuses = draft.racialBonuses ?? {}

  function handleChange(key, value) {
    updateDraft({ baseAttributes: { ...baseAttrs, [key]: Number(value) } })
  }

  const allAssigned = Object.values(baseAttrs).every(v => v > 0)
  const remaining = STANDARD_ARRAY.filter(v => !Object.values(baseAttrs).includes(v))

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs italic text-ink-300">
        <strong className="font-display not-italic">Standard Array:</strong> distribua [15, 14, 13, 12, 10, 8].
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ABILITY_SCORES.map(({ key, name, abbr }) => {
          const base = baseAttrs[key]
          const bonus = racialBonuses[key] ?? 0
          const final = finalScore(base, bonus)
          const avail = availableStandardArray(baseAttrs, key)

          return (
            <div key={key} className="flex items-center gap-2 border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
              <div className="w-10 shrink-0">
                <p className="text-[10px] font-display tracking-widest uppercase text-ink-300">{abbr}</p>
                <p className="text-xs text-ink-300 leading-tight">{name}</p>
              </div>
              <select
                value={base || ''}
                onChange={e => handleChange(key, e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-sm text-ink-500 focus:outline-none focus:border-ink-300"
              >
                <option value="">—</option>
                {(base > 0 && !avail.includes(base)) && <option value={base}>{base}</option>}
                {avail.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              {base > 0 && (
                <div className="shrink-0 text-right min-w-[48px]">
                  {bonus > 0 && <p className="text-[10px] italic text-ink-300">{base} +{bonus}</p>}
                  <p className="text-sm font-display text-ink-500">{final}</p>
                  <p className="text-[10px] text-ink-200">{formatModifier(getModifier(final))}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!allAssigned && (
        <p className="text-xs italic text-ink-300 text-center">
          Restantes: {remaining.join(', ')}
        </p>
      )}
    </div>
  )
}
