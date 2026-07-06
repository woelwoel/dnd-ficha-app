import { useState } from 'react'
import { SlotRecoveryPicker } from './SlotRecoveryPicker'
import { useDiceRoller } from '../../../../hooks/useDiceRoller'

/**
 * Painel de features do Mago (PHB p.112-118).
 *
 * Cobre:
 *  - Recuperação Arcana (nv 1): mesma mecânica de Recuperação Natural do
 *    druida — recupera slots cuja soma ≤ ⌈nv mago ÷ 2⌉, sem slots de nv 6+.
 *    1×/desc. longo.
 *  - Portento (Adivinhação, nv 2): rola 2 dados de presságio em desc. longo
 *    (3 no nv 14). Pode gastar 1 dado pra substituir qualquer d20 de
 *    qualquer criatura visível. Estado persistido em combat.portent[].
 *  - Esculpir Magias (Evocação, nv 2): passivo — só informativo.
 *  - Guarda Arcana (Abjuração, nv 2): pool de HP temporário (não tracked).
 */

function arcaneRecoveryBudget(magoLevel) {
  return Math.ceil(magoLevel / 2)
}

function portentDice(magoLevel) {
  if (magoLevel < 2)  return 0
  if (magoLevel >= 14) return 3
  return 2
}

/* ── Portento (Adivinhação) ──────────────────────────────────── */
function PortentPanel({ magoLevel, character, onUpdatePortent }) {
  const { roll } = useDiceRoller()
  const max = portentDice(magoLevel)
  const portent = character.combat?.portent ?? { dice: [] }
  const dice = Array.isArray(portent.dice) ? portent.dice : []

  function rollPortent() {
    const newDice = []
    for (let i = 0; i < max; i++) {
      const r = roll('1d20', `Portento (dado ${i + 1})`)
      newDice.push(r?.total ?? Math.floor(Math.random() * 20) + 1)
    }
    onUpdatePortent({ dice: newDice })
  }

  function useDie(index) {
    const next = dice.filter((_, i) => i !== index)
    onUpdatePortent({ dice: next })
  }

  if (max === 0) return null

  return (
    <div className="pt-2 border-t border-sky-700/30 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-sky-900">🔮 Portento <span className="text-sky-700 font-normal">(Adivinhação)</span></p>
          <p className="text-xs ink-italic">
            Rola {max}d20 em descanso longo. Gaste 1 pra substituir qualquer d20 (próprio ou de outra criatura visível) antes do resultado.
          </p>
        </div>
        <button
          onClick={rollPortent}
          className="text-xs px-3 py-1.5 rounded border-2 border-sky-700 bg-sky-100 text-sky-900 hover:bg-sky-200 font-bold transition-colors shrink-0"
        >
          {dice.length > 0 ? 'Rerolar todos' : 'Rolar dados'}
        </button>
      </div>

      {dice.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dice.map((v, i) => (
            <button
              key={i}
              onClick={() => useDie(i)}
              title="Gastar este dado pra substituir um d20 — clica pra remover"
              className="text-base font-mono font-bold w-10 h-10 rounded-full border-2 border-sky-700 bg-sky-200 text-sky-900 hover:bg-rose-200 hover:border-rose-700 hover:text-rose-900 transition-colors"
            >
              {v}
            </button>
          ))}
          <span className="text-xs ink-italic text-sky-900/70 self-center ml-1">
            Click pra gastar.
          </span>
        </div>
      )}
    </div>
  )
}

/* ── Componente principal ────────────────────────────────────── */
export function WizardArcanePanel({
  magoLevel,
  character,
  featureUses,
  onSpend,
  slotsMax,
  usedSlots,
  onToggleSlot,
  onUpdatePortent,
}) {
  const [showPicker, setShowPicker] = useState(false)

  if (magoLevel < 1) return null

  const tradition = character.info?.chosenFeatures?.arcane_tradition
  const isDivination = tradition === 'adivinhacao'
  const isEvocation  = tradition === 'evocacao'
  const isAbjuration = tradition === 'abjuracao'
  const isNecromancy = tradition === 'necromancia'

  const arcaneRec = featureUses?.find(u => u.id === 'mago-arcane-recovery')
  const arRemaining = arcaneRec ? arcaneRec.max - (arcaneRec.used ?? 0) : 0
  const arUsed = arRemaining <= 0
  const budget = arcaneRecoveryBudget(magoLevel)

  function applyRecovery(selection) {
    for (const [lvlStr, n] of Object.entries(selection)) {
      const level = Number(lvlStr)
      const cur = usedSlots[level] ?? 0
      onToggleSlot?.(level, Math.max(0, cur - n))
    }
    if (arcaneRec) onSpend?.(arcaneRec.id)
    setShowPicker(false)
  }

  return (
    <div className="rounded-lg border-2 border-sky-700/60 bg-sky-50/60 p-3 space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-2xl shrink-0" aria-hidden>📚</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-display text-sky-900 tracking-wide">
            Recursos Arcanos
          </p>
          <p className="text-xs ink-italic">
            Recuperação Arcana sempre disponível. Features de tradição aparecem conforme escolha.
          </p>
        </div>
      </div>

      {/* Recuperação Arcana — universal nv 1+ */}
      <div className="flex items-center gap-2 pt-2 border-t border-sky-700/30">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-sky-900">Recuperação Arcana</p>
          <p className="text-xs ink-italic">
            Durante desc. curto: recupera espaços ≤ <strong>{budget}</strong> níveis somados (slots 1-5). 1×/desc. longo.
          </p>
        </div>
        <button
          onClick={() => setShowPicker(v => !v)}
          disabled={arUsed}
          className={`text-xs px-3 py-1.5 rounded border-2 font-display tracking-wide transition-all shrink-0 ${
            arUsed
              ? 'border-parchment-600 bg-parchment-100 text-ink-200 cursor-not-allowed'
              : 'border-sky-700 bg-sky-100 text-sky-900 hover:bg-sky-200'
          }`}
          title={arUsed ? 'Já usado — recupera no descanso longo' : `Recupera até ${budget} níveis de slot`}
        >
          {showPicker ? 'Cancelar' : arUsed ? 'Usado' : 'Recuperar'}
        </button>
      </div>

      {showPicker && (
        <SlotRecoveryPicker
          budget={budget}
          slotsMax={slotsMax}
          usedSlots={usedSlots}
          onApply={applyRecovery}
          onCancel={() => setShowPicker(false)}
          palette="sky"
        />
      )}

      {/* Tradição: Portento (Adivinhação) */}
      {isDivination && magoLevel >= 2 && (
        <PortentPanel magoLevel={magoLevel} character={character} onUpdatePortent={onUpdatePortent} />
      )}

      {/* Tradições — passivos informativos */}
      {(isEvocation || isAbjuration || isNecromancy) && (
        <div className="pt-2 border-t border-sky-700/30 space-y-0.5">
          <p className="text-xs uppercase tracking-widest font-bold text-sky-900/70">Tradição</p>
          {isEvocation && (
            <p className="text-xs ink-italic">
              💥 <strong>Esculpir Magias</strong> (Evocação nv 2): em magias de evocação suas, aliados escolhem passar automaticamente em TRs e sofrer dano zero. Aliados protegidos = 1 + nível da magia.
            </p>
          )}
          {isAbjuration && magoLevel >= 2 && (
            <p className="text-xs ink-italic">
              🛡️ <strong>Guarda Arcana</strong> (Abjuração nv 2): ao conjurar magia de abjuração de nv 1+, recupera pool de PV temporários iguais a 2×nv magia + Int mod. Pool dura até desc. longo.
            </p>
          )}
          {isNecromancy && magoLevel >= 2 && (
            <p className="text-xs ink-italic">
              💀 <strong>Concessão do Necromante</strong> (Necromancia nv 2): cada vez que conjura magia de necromancia de nv 1+ que mata uma criatura, recupera PV iguais a 2×nv magia + Int mod.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
