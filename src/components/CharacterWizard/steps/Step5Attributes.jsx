// Passo 5 — Atributos
// Suporta: Standard Array, Point Buy (27pts) e 4d6 Drop
import { ABILITY_SCORES, STANDARD_ARRAY, POINT_BUY_COST, POINT_BUY_BUDGET, getModifier, formatModifier } from '../../../utils/calculations'

export function Step5Attributes({ draft, updateDraft }) {
  const { abilityScoreMethod } = draft.settings
  const racialBonuses = draft.racialBonuses ?? {}

  // Bônus racial para cada atributo (para preview)
  function racialBonus(key) { return racialBonuses[key] ?? 0 }
  function finalScore(key) {
    const base = draft.baseAttributes[key] || 0
    return base > 0 ? base + racialBonus(key) : 0
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-amber-400 mb-1">Atributos</h2>
        <p className="text-sm text-gray-400">
          {abilityScoreMethod === 'standard-array' && 'Distribua os valores [15, 14, 13, 12, 10, 8] entre seus atributos.'}
          {abilityScoreMethod === 'point-buy'      && `Você tem ${POINT_BUY_BUDGET} pontos para distribuir. Cada atributo começa em 8.`}
          {abilityScoreMethod === '4d6drop'        && 'Role os dados e distribua os resultados entre seus atributos.'}
        </p>
      </div>

      {abilityScoreMethod === 'standard-array' && (
        <StandardArrayUI draft={draft} updateDraft={updateDraft} finalScore={finalScore} racialBonus={racialBonus} />
      )}
      {abilityScoreMethod === 'point-buy' && (
        <PointBuyUI draft={draft} updateDraft={updateDraft} finalScore={finalScore} racialBonus={racialBonus} />
      )}
      {abilityScoreMethod === '4d6drop' && (
        <FourD6UI draft={draft} updateDraft={updateDraft} finalScore={finalScore} racialBonus={racialBonus} />
      )}
    </div>
  )
}

/* ── Standard Array ────────────────────────────────────────────── */
function StandardArrayUI({ draft, updateDraft, finalScore, racialBonus }) {
  const baseAttrs = draft.baseAttributes

  // Pool: valores do array que ainda não foram usados por outro atributo
  function availableFor(attrKey) {
    const otherUsed = Object.entries(baseAttrs)
      .filter(([k]) => k !== attrKey)
      .map(([, v]) => v)
      .filter(v => v > 0)
    return STANDARD_ARRAY.filter(v => !otherUsed.includes(v))
  }

  const allAssigned = Object.values(baseAttrs).every(v => v > 0)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ABILITY_SCORES.map(({ key, name, abbr }) => {
          const base  = baseAttrs[key]
          const bonus = racialBonus(key)
          const final = finalScore(key)
          const avail = availableFor(key)

          return (
            <div key={key} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <div className="w-10 shrink-0">
                <p className="text-[10px] text-gray-500 uppercase">{abbr}</p>
                <p className="text-xs text-gray-300 leading-tight">{name}</p>
              </div>
              <select
                value={base || ''}
                onChange={e => updateDraft({ baseAttributes: { ...draft.baseAttributes, [key]: Number(e.target.value) } })}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
              >
                <option value="">—</option>
                {/* Mostra o valor atual mesmo que não esteja mais disponível */}
                {(base > 0 && !avail.includes(base)) && (
                  <option value={base}>{base}</option>
                )}
                {avail.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              {/* Preview: base + bônus = final */}
              {base > 0 && (
                <div className="shrink-0 text-right min-w-[48px]">
                  {bonus > 0 && (
                    <p className="text-[10px] text-amber-500">{base} +{bonus}</p>
                  )}
                  <p className="text-sm font-bold text-amber-300">{final}</p>
                  <p className="text-[10px] text-gray-500">{formatModifier(getModifier(final))}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!allAssigned && (
        <p className="text-xs text-gray-500 text-center">
          Valores restantes: {STANDARD_ARRAY.filter(v => !Object.values(draft.baseAttributes).includes(v)).join(', ')}
        </p>
      )}
    </div>
  )
}

/* ── Point Buy ─────────────────────────────────────────────────── */
const PB_MIN = 8
const PB_MAX = 15

function PointBuyUI({ draft, updateDraft, finalScore, racialBonus }) {
  const baseAttrs = draft.baseAttributes
  const usedPoints = Object.values(baseAttrs).reduce((sum, v) => sum + (POINT_BUY_COST[v] ?? 0), 0)
  const remaining  = POINT_BUY_BUDGET - usedPoints

  function adjust(key, delta) {
    const cur  = baseAttrs[key]
    const next = Math.min(PB_MAX, Math.max(PB_MIN, cur + delta))
    const newUsed = usedPoints - (POINT_BUY_COST[cur] ?? 0) + (POINT_BUY_COST[next] ?? 0)
    if (newUsed > POINT_BUY_BUDGET) return  // sem pontos suficientes
    updateDraft({ baseAttributes: { ...baseAttrs, [key]: next } })
  }

  return (
    <div className="space-y-3">
      {/* Contador de pontos */}
      <div className={`flex items-center justify-between px-4 py-2 rounded-lg border ${
        remaining < 0 ? 'border-red-600 bg-red-900/20' : remaining === 0 ? 'border-amber-600 bg-amber-900/20' : 'border-gray-700 bg-gray-800'
      }`}>
        <span className="text-sm text-gray-400">Pontos disponíveis</span>
        <span className={`text-xl font-bold ${remaining < 0 ? 'text-red-400' : remaining === 0 ? 'text-amber-400' : 'text-gray-200'}`}>
          {remaining}/{POINT_BUY_BUDGET}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ABILITY_SCORES.map(({ key, name, abbr }) => {
          const base   = baseAttrs[key]
          const bonus  = racialBonus(key)
          const final  = finalScore(key)
          const cost   = POINT_BUY_COST[base] ?? 0
          const canInc = base < PB_MAX && (usedPoints - cost + (POINT_BUY_COST[base + 1] ?? 0)) <= POINT_BUY_BUDGET
          const canDec = base > PB_MIN

          return (
            <div key={key} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <div className="w-10 shrink-0">
                <p className="text-[10px] text-gray-500 uppercase">{abbr}</p>
                <p className="text-xs text-gray-300">{name}</p>
              </div>
              <div className="flex items-center gap-1 flex-1">
                <button
                  onClick={() => adjust(key, -1)}
                  disabled={!canDec}
                  className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  −
                </button>
                <span className="w-8 text-center font-bold text-white">{base}</span>
                <button
                  onClick={() => adjust(key, 1)}
                  disabled={!canInc}
                  className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  +
                </button>
              </div>
              <div className="shrink-0 text-right min-w-[52px]">
                {bonus > 0 && <p className="text-[10px] text-amber-500">{base} +{bonus}</p>}
                <p className="text-sm font-bold text-amber-300">{final}</p>
                <p className="text-[10px] text-gray-500">{formatModifier(getModifier(final))}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabela de custos */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-2">Custo acumulado por valor:</p>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(POINT_BUY_COST).map(([score, cost]) => (
            <span key={score} className="text-xs text-gray-400">
              <span className="text-gray-200">{score}</span>=<span className="text-amber-400">{cost}pt</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── 4d6 Drop Lowest ───────────────────────────────────────────── */
function FourD6UI({ draft, updateDraft, finalScore, racialBonus }) {
  const baseAttrs   = draft.baseAttributes
  const rolled      = draft.rolledScores ?? []
  const hasRolled   = rolled.length === 6

  function rollAll() {
    const scores = Array.from({ length: 6 }, () => {
      const dice = Array.from({ length: 4 }, () => Math.ceil(Math.random() * 6))
      return dice.reduce((a, b) => a + b, 0) - Math.min(...dice)
    })
    // Reset assignments when re-rolling
    updateDraft({
      rolledScores: scores,
      baseAttributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    })
  }

  function availableFor(attrKey) {
    const otherUsed = Object.entries(baseAttrs)
      .filter(([k]) => k !== attrKey)
      .map(([, v]) => v)
      .filter(v => v > 0)
    return rolled.filter(v => !otherUsed.includes(v))
  }

  return (
    <div className="space-y-4">
      {/* Botão de rolagem */}
      <div className="flex flex-col items-center gap-3 py-4 bg-gray-800 border border-gray-700 rounded-lg">
        <button
          onClick={rollAll}
          className="px-6 py-2.5 bg-amber-700 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          🎲 {hasRolled ? 'Re-rolar Dados' : 'Rolar 4d6 (×6)'}
        </button>
        {hasRolled && (
          <>
            <p className="text-xs text-gray-500">Resultados rolados (distribua abaixo):</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {rolled.map((v, i) => {
                const used = Object.values(baseAttrs).includes(v)
                return (
                  <span key={i} className={`text-sm font-bold px-3 py-1.5 rounded-lg border ${
                    used ? 'border-gray-700 text-gray-600 line-through' : 'border-amber-600 text-amber-300 bg-amber-900/20'
                  }`}>
                    {v}
                  </span>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Assignment — igual ao Standard Array */}
      {hasRolled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ABILITY_SCORES.map(({ key, name, abbr }) => {
            const base  = baseAttrs[key]
            const bonus = racialBonus(key)
            const final = finalScore(key)
            const avail = availableFor(key)

            return (
              <div key={key} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                <div className="w-10 shrink-0">
                  <p className="text-[10px] text-gray-500 uppercase">{abbr}</p>
                  <p className="text-xs text-gray-300">{name}</p>
                </div>
                <select
                  value={base || ''}
                  onChange={e => updateDraft({ baseAttributes: { ...draft.baseAttributes, [key]: Number(e.target.value) } })}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">—</option>
                  {(base > 0 && !avail.includes(base)) && <option value={base}>{base}</option>}
                  {avail.map((v, i) => <option key={i} value={v}>{v}</option>)}
                </select>
                {base > 0 && (
                  <div className="shrink-0 text-right min-w-[48px]">
                    {bonus > 0 && <p className="text-[10px] text-amber-500">{base} +{bonus}</p>}
                    <p className="text-sm font-bold text-amber-300">{final}</p>
                    <p className="text-[10px] text-gray-500">{formatModifier(getModifier(final))}</p>
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
