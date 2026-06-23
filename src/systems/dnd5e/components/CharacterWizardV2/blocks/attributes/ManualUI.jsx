// src/components/CharacterWizardV2/blocks/attributes/ManualUI.jsx
import { ABILITY_SCORES, getModifier, formatModifier } from '../../../../../../utils/calculations'
import { finalScore } from './attribute-helpers'

function clamp(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(3, Math.min(18, Math.round(n)))
}

export function ManualUI({ draft, updateDraft }) {
  const baseAttrs = draft.baseAttributes
  const racialBonuses = draft.racialBonuses ?? {}

  function handleChange(key, raw) {
    updateDraft({ baseAttributes: { ...baseAttrs, [key]: clamp(raw) } })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs italic text-ink-300">
        <strong className="font-display not-italic">Manual:</strong> digite os valores (3-18) para cada atributo.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ABILITY_SCORES.map(({ key, name, abbr }) => {
          const base = baseAttrs[key]
          const bonus = racialBonuses[key] ?? 0
          const final = finalScore(base, bonus)
          return (
            <div key={key} className="flex items-center gap-2 border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
              <div className="w-10 shrink-0">
                <p className="text-xs font-display tracking-widest uppercase text-ink-300">{abbr}</p>
                <p className="text-xs text-ink-300">{name}</p>
              </div>
              <input
                type="number"
                min={3}
                max={18}
                value={base || ''}
                onChange={e => handleChange(key, e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-sm text-ink-500 text-center focus:outline-none focus:border-ink-300"
              />
              {base > 0 && (
                <div className="shrink-0 text-right min-w-[52px]">
                  {bonus > 0 && <p className="text-xs italic text-ink-300">{base} +{bonus}</p>}
                  <p className="text-sm font-display text-ink-500">{final}</p>
                  <p className="text-xs text-ink-200">{formatModifier(getModifier(final))}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
