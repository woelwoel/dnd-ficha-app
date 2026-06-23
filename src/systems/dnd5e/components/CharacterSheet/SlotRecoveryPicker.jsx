import { useMemo, useState } from 'react'

/**
 * Picker reutilizável de slots de magia a recuperar via feature de classe.
 *
 * Compartilhado por:
 *  - Druida Círculo da Terra — Recuperação Natural (PHB p.69)
 *  - Mago — Recuperação Arcana (PHB p.115)
 *
 * Regra comum (ambas as classes): durante descanso curto, recupera espaços
 * cuja soma de níveis seja ≤ ⌈nv classe ÷ 2⌉, e nenhum slot pode ser de
 * nível ≥ 6. 1×/descanso longo.
 *
 * Props:
 *  - budget         número máximo de "níveis somados" a recuperar
 *  - slotsMax       { [level]: max }
 *  - usedSlots      { [level]: used }
 *  - onApply(sel)   sel = { [level]: count } — quantos slots de cada nível recuperar
 *  - onCancel()
 *  - palette        'emerald' (druida) | 'sky' (mago) — só estética
 */
export function SlotRecoveryPicker({
  budget, slotsMax, usedSlots, onApply, onCancel, palette = 'emerald',
}) {
  // Apenas níveis 1-5 com slots gastos
  const recoverable = useMemo(() => {
    const out = []
    for (let lvl = 1; lvl <= 5; lvl++) {
      const max  = slotsMax[lvl] ?? 0
      const used = usedSlots[lvl] ?? 0
      if (max > 0 && used > 0) out.push({ level: lvl, max, used })
    }
    return out
  }, [slotsMax, usedSlots])

  const [selection, setSelection] = useState({})

  const totalBudgetUsed = Object.entries(selection).reduce(
    (sum, [lvl, n]) => sum + Number(lvl) * n, 0
  )
  const remaining = budget - totalBudgetUsed

  function setN(level, n) {
    setSelection(s => ({ ...s, [level]: Math.max(0, n) }))
  }

  function canIncrease(level) {
    const row = recoverable.find(r => r.level === level)
    if (!row) return false
    const cur = selection[level] ?? 0
    return cur < row.used && (remaining - level) >= 0
  }

  // Paleta de cores
  const p = palette === 'sky'
    ? {
        bg: 'bg-sky-50', border: 'border-sky-700/30', headerText: 'text-sky-900',
        budgetBg: 'bg-sky-100', budgetText: 'text-sky-900', btn: 'bg-sky-200 hover:bg-sky-300 text-sky-900',
        applyBg: 'border-sky-700 bg-sky-700 hover:bg-sky-800',
      }
    : {
        bg: 'bg-emerald-50', border: 'border-emerald-700/30', headerText: 'text-emerald-900',
        budgetBg: 'bg-emerald-100', budgetText: 'text-emerald-900', btn: 'bg-emerald-200 hover:bg-emerald-300 text-emerald-900',
        applyBg: 'border-emerald-700 bg-emerald-700 hover:bg-emerald-800',
      }

  if (recoverable.length === 0) {
    return (
      <div className={`mt-2 pt-2 border-t ${p.border}`}>
        <p className="text-xs italic text-ink-300">Sem espaços gastos pra recuperar.</p>
        <button
          onClick={onCancel}
          className="mt-1 text-xs px-2 py-1 rounded border border-parchment-600 bg-parchment-100 text-ink-300 hover:bg-parchment-200"
        >
          Fechar
        </button>
      </div>
    )
  }

  return (
    <div className={`mt-2 pt-2 border-t ${p.border} space-y-2`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className={`text-xs uppercase tracking-widest font-bold ${p.headerText}`}>
          Escolher espaços pra recuperar
        </p>
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
          remaining < 0
            ? 'border-rose-700 bg-rose-100 text-rose-800'
            : remaining === 0
              ? `border-emerald-700 ${p.budgetBg} ${p.budgetText}`
              : `border-emerald-700 ${p.budgetBg} ${p.budgetText}`
        }`}>
          Orçamento: {budget - remaining}/{budget} níveis
        </span>
      </div>

      <div className="space-y-1">
        {recoverable.map(row => {
          const cur = selection[row.level] ?? 0
          return (
            <div key={row.level} className={`flex items-center gap-2 ${p.bg} rounded px-2 py-1.5 border ${p.border}`}>
              <span className={`text-sm font-bold ${p.headerText} shrink-0 w-12`}>Nv {row.level}</span>
              <span className={`text-xs ${p.headerText}/70 shrink-0`}>gastos: {row.used}/{row.max}</span>
              <div className="flex-1" />
              <button
                onClick={() => setN(row.level, cur - 1)}
                disabled={cur <= 0}
                className={`w-7 h-7 rounded ${p.btn} disabled:bg-parchment-200 disabled:text-ink-200 disabled:cursor-not-allowed font-bold`}
              >−</button>
              <span className={`font-mono text-sm ${p.headerText} min-w-[3ch] text-center font-bold`}>{cur}</span>
              <button
                onClick={() => setN(row.level, cur + 1)}
                disabled={!canIncrease(row.level)}
                className={`w-7 h-7 rounded ${p.btn} disabled:bg-parchment-200 disabled:text-ink-200 disabled:cursor-not-allowed font-bold`}
              >+</button>
              <span className={`text-xs ${p.headerText}/70 font-mono shrink-0 w-12 text-right`}>
                = {cur * row.level} nv
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-xs italic text-ink-300">
        Slots de Nv 6+ não podem ser recuperados (PHB).
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onApply(selection)}
          disabled={totalBudgetUsed === 0 || remaining < 0}
          className={`text-xs px-3 py-1.5 rounded border-2 ${p.applyBg} text-white font-bold disabled:border-parchment-600 disabled:bg-parchment-200 disabled:text-ink-200 disabled:cursor-not-allowed transition-colors`}
        >
          Recuperar
        </button>
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1 rounded border border-parchment-600 bg-parchment-100 text-ink-300 hover:bg-parchment-200"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
