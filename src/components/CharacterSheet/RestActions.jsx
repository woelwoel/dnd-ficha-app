import { useState } from 'react'
import { toHitDicePool, totalHitDiceAvailable } from '../../utils/hitDice'
import { performShortRest, performLongRest } from '../../utils/rest'
import { getModifier, formatModifier } from '../../utils/calculations'

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
    if (!spent.length) {
      setShortOpen(false)
      return
    }
    onApply(prev => performShortRest(prev, { spent }))
    setCounts({})
    setRolls({})
    setShortOpen(false)
  }

  function applyLong() {
    if (!window.confirm('Aplicar descanso longo? HP volta ao máximo, metade dos HD é recuperada e todos os slots são restaurados.')) return
    onApply(prev => performLongRest(prev))
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest">Descansos</h3>
        <span className="text-xs text-gray-500">
          CON {formatModifier(conMod)} · HD disp.: {totalAvail}
        </span>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          onClick={() => setShortOpen(v => !v)}
          disabled={totalAvail <= 0 && !shortOpen}
          className="flex-1 text-sm px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white font-semibold"
        >
          {shortOpen ? 'Fechar' : 'Descanso Curto'}
        </button>
        <button
          onClick={applyLong}
          className="flex-1 text-sm px-3 py-1.5 rounded bg-green-700 hover:bg-green-600 text-white font-semibold"
        >
          Descanso Longo
        </button>
      </div>

      {shortOpen && (
        <div className="mt-3 p-3 bg-gray-900 rounded-lg space-y-2">
          <p className="text-xs text-gray-400">
            Gaste HD para curar HP. Cada HD cura a rolagem + mod CON ({formatModifier(conMod)}), mínimo 1.
            Deixe a rolagem em branco para usar a média do dado.
          </p>
          {dice.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum HD disponível.</p>
          ) : dice.map(([die, v]) => {
            const remaining = Math.max(0, (v.total ?? 0) - (v.used ?? 0))
            const count = counts[die] ?? 0
            return (
              <div key={die} className="grid grid-cols-[3rem_auto_1fr] gap-2 items-center">
                <span className="text-sm font-semibold text-gray-200">{die}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => bump(die, -1)}
                    disabled={count <= 0}
                    className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white"
                  >−</button>
                  <span className="w-10 text-center text-sm text-white">
                    {count}/{remaining}
                  </span>
                  <button
                    onClick={() => bump(die, +1)}
                    disabled={count >= remaining}
                    className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white"
                  >+</button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={`soma ${die} (média)`}
                  value={rolls[die] ?? ''}
                  onChange={e => setRolls(r => ({ ...r, [die]: e.target.value.replace(/\D/g, '') }))}
                  disabled={count <= 0}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white disabled:opacity-40"
                />
              </div>
            )
          })}
          <button
            onClick={applyShort}
            disabled={Object.values(counts).every(c => !c)}
            className="w-full py-1.5 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white text-sm font-semibold"
          >
            Aplicar Descanso Curto
          </button>
        </div>
      )}
    </div>
  )
}
