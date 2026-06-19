import { useState } from 'react'
import { toHitDicePool, totalHitDiceAvailable } from '../../utils/hitDice'
import { performShortRest, performLongRest } from '../../utils/rest'
import { getModifier, formatModifier } from '../../utils/calculations'
import { ConfirmDialog } from '../ui/ConfirmDialog'

/**
 * Painel de descansos (PHB p.186).
 *
 * O componente é *controlado*: recebe o personagem e devolve o próximo via
 * `onApply(nextCharacter)`. A lógica pura vive em `utils/rest.js`.
 *
 * Descanso curto: o jogador escolhe quantos dados de cada tipo gastar e a
 *   soma rolada (o dono da mesa pode rolar ou calcular média). A cura é
 *   `soma + mod CON × quantidade` (mínimo 1 por HD).
 * Descanso longo: botão único (HP cheio, ½ HD de volta, slots resetados).
 */
export function RestActions({ character, onApply }) {
  const pool = toHitDicePool(character.combat?.hitDice)
  const dice = Object.entries(pool)
    .filter(([, v]) => (v?.total ?? 0) > 0)
    .sort(([a], [b]) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
  const totalAvail = totalHitDiceAvailable(character.combat?.hitDice)
  const conMod = getModifier(character.attributes?.con ?? 10)
  const [shortOpen, setShortOpen] = useState(false)
  const [longConfirmOpen, setLongConfirmOpen] = useState(false)
  // counts: { d8: 2, d10: 1, ... } quantidade de HD a gastar
  const [counts, setCounts] = useState({})
  // rolls: { d8: '12', ... } soma das rolagens por tipo (média = ceil((die+1)/2))
  const [rolls, setRolls] = useState({})

  function bump(die, delta) {
    const max = Math.max(0, (pool[die]?.total ?? 0) - (pool[die]?.used ?? 0))
    setCounts(c => {
      const next = Math.max(0, Math.min(max, (c[die] ?? 0) + delta))
      return { ...c, [die]: next }
    })
  }

  function applyShort() {
    const spent = []
    for (const [die, count] of Object.entries(counts)) {
      if (!count) continue
      const roll = parseInt(rolls[die] ?? '0', 10) || 0
      // Distribui o roll informado de forma uniforme entre os dados gastos.
      // Se o jogador não informou, usa média (teto: (lados+1)/2).
      const sides = parseInt(die.slice(1), 10)
      const avg = Math.ceil((sides + 1) / 2)
      const perDie = count > 0
        ? (roll > 0 ? Math.round(roll / count) : avg)
        : 0
      for (let i = 0; i < count; i++) spent.push({ die, roll: perDie })
    }
    // Gastar HD é OPCIONAL (PHB p.186): mesmo com `spent` vazio aplicamos o
    // descanso curto para recarregar recursos (Ki, Surto de Ação, Pact Magic
    // etc.) sem forçar o gasto de Dado de Vida quando não se perdeu PV.
    onApply(prev => performShortRest(prev, { spent }))
    setCounts({})
    setRolls({})
    setShortOpen(false)
  }

  function applyLong() {
    onApply(prev => performLongRest(prev))
    setLongConfirmOpen(false)
  }

  return (
    <div className="bg-parchment-100 border border-parchment-600 rounded-lg px-3 py-2 shadow-parchment-sm">
      {/* Linha compacta: rótulo + meta + 2 botões inline */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-display text-ink-500 uppercase tracking-widest shrink-0">
          Descansos
        </span>
        <span className="text-xs ink-italic text-ink-300 shrink-0">
          CON {formatModifier(conMod)} · HD disp.: {totalAvail}
        </span>
        <div className="flex gap-1.5 ml-auto shrink-0">
          <button
            onClick={() => setShortOpen(v => !v)}
            disabled={totalAvail <= 0 && !shortOpen}
            className="text-xs px-2.5 py-1 rounded-sm border border-parchment-600 hover:border-ink-300 text-ink-500 hover:bg-parchment-200 disabled:opacity-40 disabled:cursor-not-allowed font-display tracking-wide transition-colors"
          >
            {shortOpen ? 'Fechar' : 'Descanso Curto'}
          </button>
          <button
            onClick={() => setLongConfirmOpen(true)}
            className="text-xs px-2.5 py-1 rounded-sm bg-ink-500 hover:bg-ink-600 border border-ink-600 text-parchment-50 font-display tracking-wide transition-colors"
          >
            Descanso Longo
          </button>
        </div>
      </div>

      {shortOpen && (
        <div className="mt-3 p-3 bg-parchment-50 border border-parchment-600 rounded-sm space-y-2">
          <p className="text-[13px] ink-italic text-ink-300 leading-relaxed">
            Gastar HD é <strong>opcional</strong>: deixe em 0 para só recarregar recursos
            (Ki, Surto de Ação, Pact Magic). Cada HD cura a rolagem + mod CON ({formatModifier(conMod)}),
            mínimo 1. Em branco usa a média do dado.
          </p>
          {dice.length === 0 ? (
            <p className="text-xs ink-italic text-ink-300">Nenhum HD disponível.</p>
          ) : dice.map(([die, v]) => {
            const remaining = Math.max(0, (v.total ?? 0) - (v.used ?? 0))
            const count = counts[die] ?? 0
            return (
              <div key={die} className="grid grid-cols-[3rem_auto_1fr] gap-2 items-center">
                <span className="text-sm font-semibold text-ink-500 font-display">{die}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => bump(die, -1)}
                    disabled={count <= 0}
                    className="w-6 h-6 rounded-sm bg-parchment-100 hover:bg-parchment-200 border border-parchment-600 disabled:opacity-40 text-ink-500"
                  >−</button>
                  <span className="w-10 text-center text-sm text-ink-500 tabular-nums">
                    {count}/{remaining}
                  </span>
                  <button
                    onClick={() => bump(die, +1)}
                    disabled={count >= remaining}
                    className="w-6 h-6 rounded-sm bg-parchment-100 hover:bg-parchment-200 border border-parchment-600 disabled:opacity-40 text-ink-500"
                  >+</button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={`soma ${die} (média)`}
                  value={rolls[die] ?? ''}
                  onChange={e => setRolls(r => ({ ...r, [die]: e.target.value.replace(/\D/g, '') }))}
                  disabled={count <= 0}
                  className="w-full bg-parchment-50 border border-parchment-600 rounded-sm px-2 py-1 text-xs text-ink-500 disabled:opacity-40 placeholder:text-ink-300 placeholder:italic focus:outline-none focus:border-ink-300"
                />
              </div>
            )
          })}
          <button
            onClick={applyShort}
            className="w-full py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 text-parchment-50 text-xs font-display tracking-wide transition-colors"
          >
            {Object.values(counts).some(c => c > 0)
              ? 'Aplicar Descanso Curto'
              : 'Descansar (sem gastar HD)'}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={longConfirmOpen}
        title="Descanso longo?"
        message={
          <>
            <p className="mb-2">Vai aplicar um descanso longo (8h):</p>
            <ul className="list-disc pl-5 space-y-0.5 ink-italic text-ink-300">
              <li>PV volta ao máximo</li>
              <li>Metade dos Dados de Vida é recuperada</li>
              <li>Todos os espaços de magia são restaurados</li>
              <li>Recursos com recarga "longo" voltam</li>
            </ul>
          </>
        }
        confirmLabel="Descansar"
        cancelLabel="Cancelar"
        onConfirm={applyLong}
        onCancel={() => setLongConfirmOpen(false)}
      />
    </div>
  )
}
