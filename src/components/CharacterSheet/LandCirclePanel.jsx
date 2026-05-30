import { useState } from 'react'
import { SlotRecoveryPicker } from './SlotRecoveryPicker'

/**
 * Painel de features do Círculo da Terra (PHB p.69).
 *
 * Cobre:
 *  - Recuperação Natural (nv 2+): durante descanso curto, recupera espaços
 *    cuja soma de níveis seja ≤ ⌈nv druida ÷ 2⌉. Slots de nv 6+ não podem
 *    ser recuperados. 1×/descanso longo.
 *  - Refúgio da Natureza (nv 14+): conjura forma de planta em si, 1×/desc
 *    longo. Não há tracking detalhado — botão "Usar" consome o recurso.
 */

function naturalRecoveryBudget(druidaLevel) {
  // ⌈nv ÷ 2⌉ níveis de slot recuperáveis. PHB p.69.
  return Math.ceil(druidaLevel / 2)
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
          palette="emerald"
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
