// src/components/CharacterWizardV2/blocks/attributes/FourD6UI.jsx
import { ABILITY_SCORES, getModifier, formatModifier } from '../../../../utils/calculations'
import { finalScore, rollFourD6DropSix, availableRolled } from './attribute-helpers'

export function FourD6UI({ draft, updateDraft }) {
  const baseAttrs = draft.baseAttributes
  const racialBonuses = draft.racialBonuses ?? {}
  const rolled = draft.rolledScores ?? []
  const hasRolled = rolled.length === 6

  function rollAll() {
    updateDraft({
      rolledScores: rollFourD6DropSix(),
      baseAttributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    })
  }

  function handleChange(key, value) {
    updateDraft({ baseAttributes: { ...baseAttrs, [key]: Number(value) } })
  }

  const tagged = rolled.map((v, i) => ({ v, i, used: false }))
  for (const val of Object.values(baseAttrs)) {
    if (val > 0) {
      const slot = tagged.find(p => p.v === val && !p.used)
      if (slot) slot.used = true
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-3 py-4 border-2 border-parchment-600 bg-parchment-100 rounded-sm">
        <button
          type="button"
          onClick={rollAll}
          className="px-6 py-2.5 bg-ink-500 hover:bg-ink-600 text-parchment-50 font-display rounded-sm transition-colors text-sm"
        >
          🎲 {hasRolled ? 'Re-rolar Dados' : 'Rolar 4d6 (×6)'}
        </button>
        {hasRolled && (
          <>
            <p className="text-xs italic text-ink-300">Resultados (distribua abaixo):</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {tagged.map(({ v, i, used }) => (
                <span key={i} className={[
                  'text-sm font-display px-3 py-1.5 rounded-sm border-2',
                  used ? 'border-parchment-600 text-ink-200 line-through bg-parchment-50' : 'border-ink-500 text-ink-500 bg-parchment-200',
                ].join(' ')}>
                  {v}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {hasRolled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ABILITY_SCORES.map(({ key, name, abbr }) => {
            const base = baseAttrs[key]
            const bonus = racialBonuses[key] ?? 0
            const final = finalScore(base, bonus)
            const avail = availableRolled(rolled, baseAttrs, key)
            return (
              <div key={key} className="flex items-center gap-2 border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
                <div className="w-10 shrink-0">
                  <p className="text-xs font-display tracking-widest uppercase text-ink-300">{abbr}</p>
                  <p className="text-xs text-ink-300">{name}</p>
                </div>
                <select
                  value={base || ''}
                  onChange={e => handleChange(key, e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-sm text-ink-500 focus:outline-none focus:border-ink-300"
                >
                  <option value="">—</option>
                  {(base > 0 && !avail.includes(base)) && <option value={base}>{base}</option>}
                  {avail.map((v, i) => <option key={i} value={v}>{v}</option>)}
                </select>
                {base > 0 && (
                  <div className="shrink-0 text-right min-w-[48px]">
                    {bonus > 0 && <p className="text-xs italic text-ink-300">{base} +{bonus}</p>}
                    <p className="text-sm font-display text-ink-500">{final}</p>
                    <p className="text-xs text-ink-200">{formatModifier(getModifier(final))}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
