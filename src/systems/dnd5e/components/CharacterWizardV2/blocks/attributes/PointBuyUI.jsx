// src/components/CharacterWizardV2/blocks/attributes/PointBuyUI.jsx
import {
  ABILITY_SCORES, POINT_BUY_COST, POINT_BUY_BUDGET,
  getModifier, formatModifier,
} from '../../../../../../utils/calculations'
import { finalScore } from './attribute-helpers'

const PB_MIN = 8
const PB_MAX = 15

export function PointBuyUI({ draft, updateDraft }) {
  const baseAttrs = draft.baseAttributes
  const racialBonuses = draft.racialBonuses ?? {}
  const inited = Object.values(baseAttrs).every(v => v >= PB_MIN)
  const effectiveBase = inited ? baseAttrs : { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }
  const usedPoints = Object.values(effectiveBase).reduce((sum, v) => sum + (POINT_BUY_COST[v] ?? 0), 0)
  const remaining = POINT_BUY_BUDGET - usedPoints

  function adjust(key, delta) {
    const cur = effectiveBase[key]
    const next = Math.min(PB_MAX, Math.max(PB_MIN, cur + delta))
    const newUsed = usedPoints - (POINT_BUY_COST[cur] ?? 0) + (POINT_BUY_COST[next] ?? 0)
    if (newUsed > POINT_BUY_BUDGET) return
    updateDraft({ baseAttributes: { ...effectiveBase, [key]: next } })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={[
        'flex items-center justify-between px-4 py-2 rounded-sm border-2 font-display',
        remaining < 0 ? 'border-red-700 bg-red-50' :
        remaining === 0 ? 'border-amber-700 bg-amber-50' :
        'border-parchment-600 bg-parchment-100',
      ].join(' ')}>
        <span className="text-sm text-ink-500">Pontos disponíveis</span>
        <span className="text-xl text-ink-500">{remaining}/{POINT_BUY_BUDGET}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ABILITY_SCORES.map(({ key, name, abbr }) => {
          const base = effectiveBase[key]
          const bonus = racialBonuses[key] ?? 0
          const final = finalScore(base, bonus)
          const cost = POINT_BUY_COST[base] ?? 0
          const canInc = base < PB_MAX && (usedPoints - cost + (POINT_BUY_COST[base + 1] ?? 0)) <= POINT_BUY_BUDGET
          const canDec = base > PB_MIN

          return (
            <div key={key} className="flex items-center gap-2 border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
              <div className="w-10 shrink-0">
                <p className="text-xs font-display tracking-widest uppercase text-ink-300">{abbr}</p>
                <p className="text-xs text-ink-300">{name}</p>
              </div>
              <div className="flex items-center gap-1 flex-1">
                <button
                  type="button"
                  aria-label={`-1 ${abbr}`}
                  onClick={() => adjust(key, -1)}
                  disabled={!canDec}
                  className="w-7 h-7 rounded-sm border-2 border-parchment-600 bg-parchment-50 hover:bg-parchment-200 text-lg font-display disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  −
                </button>
                <span className="w-8 text-center font-display text-ink-500">{base}</span>
                <button
                  type="button"
                  aria-label="+"
                  onClick={() => adjust(key, 1)}
                  disabled={!canInc}
                  className="w-7 h-7 rounded-sm border-2 border-parchment-600 bg-parchment-50 hover:bg-parchment-200 text-lg font-display disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>
              <div className="shrink-0 text-right min-w-[52px]">
                {bonus > 0 && <p className="text-xs italic text-ink-300">{base} +{bonus}</p>}
                <p className="text-sm font-display text-ink-500">{final}</p>
                <p className="text-xs text-ink-200">{formatModifier(getModifier(final))}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-2 border-parchment-600 bg-parchment-50 rounded-sm p-3">
        <p className="text-xs font-display tracking-widest uppercase text-ink-300 mb-2">Custo por valor:</p>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(POINT_BUY_COST).map(([score, cost]) => (
            <span key={score} className="text-xs text-ink-300">
              <span className="font-display text-ink-500">{score}</span>=<span className="font-display text-ink-500">{cost}pt</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
