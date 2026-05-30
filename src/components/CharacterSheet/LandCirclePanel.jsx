import { useMemo, useState } from 'react'

/**
 * Painel de features do Círculo da Terra (PHB p.69).
 *
 * Cobre:
 *  - Recuperação Natural (nv 2+): durante descanso curto, recupera espaços
 *    cuja soma de níveis seja ≤ ⌈nv druida ÷ 2⌉. Slots de nv 6+ não podem
 *    ser recuperados. 1×/descanso longo.
 *  - Refúgio da Natureza (nv 14+): conjura forma de planta em si, 1×/desc
 *    longo. Não há tracking detalhado — botão "Usar" consome o recurso.
 *
 * Não renderiza nada se o personagem não for druida do Círculo da Terra
 * com nível ≥ 2 (PHB).
 */

function naturalRecoveryBudget(druidaLevel) {
  // ⌈nv ÷ 2⌉ níveis de slot recuperáveis. PHB p.69.
  return Math.ceil(druidaLevel / 2)
}

/* ── Picker de slots a recuperar ───────────────────────────────── */
function SlotRecoveryPicker({
  budget, slotsMax, usedSlots, onApply, onCancel,
}) {
  // Slots gastos disponíveis pra recuperar — apenas níveis 1-5 (regra PHB p.69)
  const recoverable = useMemo(() => {
    const out = []
    for (let lvl = 1; lvl <= 5; lvl++) {
      const max  = slotsMax[lvl] ?? 0
      const used = usedSlots[lvl] ?? 0
      if (max > 0 && used > 0) out.push({ level: lvl, max, used })
    }
    return out
  }, [slotsMax, usedSlots])

  // Estado: { [level]: número a recuperar }
  const [selection, setSelection] = useState({})

  const totalBudgetUsed = Object.entries(selection).reduce(
    (sum, [lvl, n]) => sum + Number(lvl) * n,
    0
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

  function apply() {
    onApply(selection)
  }

  if (recoverable.length === 0) {
    return (
      <div className="mt-2 pt-2 border-t border-emerald-700/30">
        <p className="text-xs italic text-ink-300">
          Sem espaços gastos pra recuperar.
        </p>
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
    <div className="mt-2 pt-2 border-t border-emerald-700/30 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs uppercase tracking-widest font-bold text-emerald-900">
          Escolher espaços pra recuperar
        </p>
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
          remaining < 0
            ? 'border-rose-700 bg-rose-100 text-rose-800'
            : remaining === 0
              ? 'border-emerald-700 bg-emerald-200 text-emerald-900'
              : 'border-emerald-700 bg-emerald-100 text-emerald-900'
        }`}>
          Orçamento: {budget - remaining}/{budget} níveis
        </span>
      </div>

      <div className="space-y-1">
        {recoverable.map(row => {
          const cur = selection[row.level] ?? 0
          return (
            <div key={row.level} className="flex items-center gap-2 bg-emerald-50 rounded px-2 py-1.5 border border-emerald-700/30">
              <span className="text-sm font-bold text-emerald-900 shrink-0 w-12">Nv {row.level}</span>
              <span className="text-xs text-emerald-900/70 shrink-0">gastos: {row.used}/{row.max}</span>
              <div className="flex-1" />
              <button
                onClick={() => setN(row.level, cur - 1)}
                disabled={cur <= 0}
                className="w-7 h-7 rounded bg-emerald-200 hover:bg-emerald-300 disabled:bg-parchment-200 disabled:text-ink-200 disabled:cursor-not-allowed text-emerald-900 font-bold"
              >−</button>
              <span className="font-mono text-sm text-emerald-900 min-w-[3ch] text-center font-bold">{cur}</span>
              <button
                onClick={() => setN(row.level, cur + 1)}
                disabled={!canIncrease(row.level)}
                className="w-7 h-7 rounded bg-emerald-200 hover:bg-emerald-300 disabled:bg-parchment-200 disabled:text-ink-200 disabled:cursor-not-allowed text-emerald-900 font-bold"
              >+</button>
              <span className="text-xs text-emerald-900/70 font-mono shrink-0 w-12 text-right">
                = {cur * row.level} nv
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-xs italic text-ink-300">
        Slots de Nv 6+ não podem ser recuperados (PHB p.69). Recuperação acontece durante descanso curto.
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={apply}
          disabled={totalBudgetUsed === 0 || remaining < 0}
          className="text-xs px-3 py-1.5 rounded border-2 border-emerald-700 bg-emerald-700 text-white font-bold hover:bg-emerald-800 disabled:border-parchment-600 disabled:bg-parchment-200 disabled:text-ink-200 disabled:cursor-not-allowed transition-colors"
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

/* ── Componente principal ──────────────────────────────────────── */
export function LandCirclePanel({
  druidaLevel,
  character,
  featureUses,
  onSpend,
  slotsMax,
  usedSlots,
  onToggleSlot,
}) {
  const [showPicker, setShowPicker] = useState(false)

  const isLand = character.info?.chosenFeatures?.druid_circle === 'terra'
  const naturalRecovery = featureUses?.find(u => u.id === 'druida-natural-recovery')
  const naturesSanctuary = featureUses?.find(u => u.id === 'druida-natures-sanctuary')

  if (!isLand || druidaLevel < 2) return null

  const nrRemaining = naturalRecovery ? naturalRecovery.max - (naturalRecovery.used ?? 0) : 0
  const nrUsed = nrRemaining <= 0
  const budget = naturalRecoveryBudget(druidaLevel)

  function applyRecovery(selection) {
    // Para cada (level, n), reduz usedSlots[level] em n
    for (const [lvlStr, n] of Object.entries(selection)) {
      const level = Number(lvlStr)
      const cur = usedSlots[level] ?? 0
      const next = Math.max(0, cur - n)
      onToggleSlot?.(level, next)
    }
    if (naturalRecovery) onSpend?.(naturalRecovery.id)
    setShowPicker(false)
  }

  function useSanctuary() {
    if (!naturesSanctuary || (naturesSanctuary.used ?? 0) >= naturesSanctuary.max) return
    onSpend?.(naturesSanctuary.id)
  }

  const sancUsed = naturesSanctuary && (naturesSanctuary.used ?? 0) >= naturesSanctuary.max

  return (
    <div className="rounded-lg border-2 border-emerald-700/60 bg-emerald-50/60 p-3 space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-2xl shrink-0" aria-hidden>🌍</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-display text-emerald-900 tracking-wide">
            Círculo da Terra
          </p>
          <p className="text-xs ink-italic">
            Druidas-magos da tradição da terra. Magias do círculo já preparadas e features de recuperação.
          </p>
        </div>
      </div>

      {/* Recuperação Natural — nv 2+ */}
      <div className="flex items-center gap-2 pt-2 border-t border-emerald-700/30">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-emerald-900">Recuperação Natural</p>
          <p className="text-xs ink-italic">
            Durante desc. curto: recupera espaços ≤ <strong>{budget}</strong> níveis somados (slots 1-5). 1×/desc. longo.
          </p>
        </div>
        <button
          onClick={() => setShowPicker(v => !v)}
          disabled={nrUsed}
          className={`text-xs px-3 py-1.5 rounded border-2 font-display tracking-wide transition-all shrink-0 ${
            nrUsed
              ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
              : 'border-emerald-700 bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
          }`}
          title={nrUsed ? 'Já usado — recupera no descanso longo' : `Recupera até ${budget} níveis de slot`}
        >
          {showPicker ? 'Cancelar' : nrUsed ? 'Usado' : 'Recuperar'}
        </button>
      </div>

      {showPicker && (
        <SlotRecoveryPicker
          budget={budget}
          slotsMax={slotsMax}
          usedSlots={usedSlots}
          onApply={applyRecovery}
          onCancel={() => setShowPicker(false)}
        />
      )}

      {/* Refúgio da Natureza — nv 14+ */}
      {naturesSanctuary && (
        <div className="flex items-center gap-2 pt-2 border-t border-emerald-700/30">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-900">Refúgio da Natureza</p>
            <p className="text-xs ink-italic">
              Como ação, lança Refúgio das Plantas em si. 1×/desc. longo.
            </p>
          </div>
          <button
            onClick={useSanctuary}
            disabled={sancUsed}
            className={`text-xs px-3 py-1.5 rounded border-2 font-display tracking-wide transition-all shrink-0 ${
              sancUsed
                ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
                : 'border-emerald-700 bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
            }`}
          >
            {sancUsed ? 'Usado' : 'Usar'}
          </button>
        </div>
      )}

      {/* Passivos — só informativo */}
      {druidaLevel >= 6 && (
        <div className="pt-2 border-t border-emerald-700/30 space-y-0.5">
          <p className="text-xs uppercase tracking-widest font-bold text-emerald-900/70">Passivos</p>
          {druidaLevel >= 6 && (
            <p className="text-xs ink-italic">
              🌿 <strong>Passos da Terra</strong> (nv 6): terreno difícil natural não custa movimento extra, sem deixar rastros nem ativar armadilhas naturais.
            </p>
          )}
          {druidaLevel >= 10 && (
            <p className="text-xs ink-italic">
              🛡️ <strong>Vínculo com a Terra</strong> (nv 10): imune a dano de veneno e a doenças. Não precisa comer nem beber.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
