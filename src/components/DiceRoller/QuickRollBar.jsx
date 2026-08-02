import { useEffect, useState } from 'react'
import { useDiceRoller } from '../../hooks/useDiceRoller'
import { Button } from '../ui/Button'
import {
  QUICK_ROLL_SIDES, buildNotation, clampCount, parseMod,
  readQuickRollPref, writeQuickRollPref,
} from './quickRoll'

/**
 * Rolagem livre dentro do painel: escolhe tipo, quantidade e modificador.
 *
 * Não conhece o motor de dados — chama o mesmo `roll()` que perícias e ataques
 * usam, e com isso herda dados 3D, entrada no histórico e o modo pendente
 * (vantagem/desvantagem) sem uma linha de regra própria.
 *
 * A quantidade é guardada como TEXTO enquanto o usuário digita (pra ele poder
 * apagar o campo) e só é presa na faixa 1–20 na hora de usar; o blur devolve o
 * valor normalizado pro campo.
 */
export function QuickRollBar() {
  const { roll } = useDiceRoller()
  const [saved] = useState(readQuickRollPref)
  const [sides, setSides] = useState(saved.sides)
  const [countText, setCountText] = useState(String(saved.count))
  const [modText, setModText] = useState(saved.mod ? String(saved.mod) : '')

  const count = clampCount(countText)
  const mod = parseMod(modText)
  const notation = buildNotation({ count, sides, mod })

  useEffect(() => { writeQuickRollPref({ sides, count, mod }) }, [sides, count, mod])

  const chip = (active) => [
    'text-xs font-bold py-1 rounded border transition-all',
    active
      ? 'border-ink-300 bg-parchment-50 text-ink-500 shadow-inner'
      : 'border-parchment-600 text-ink-200 hover:border-ink-300 hover:text-ink-500',
  ].join(' ')

  const stepper = 'px-2 py-0.5 text-sm font-bold text-ink-200 hover:text-ink-500 transition-colors'

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 border-b border-parchment-600 bg-parchment-100 shrink-0">
      <div className="grid grid-cols-7 gap-1">
        {QUICK_ROLL_SIDES.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSides(s)}
            aria-pressed={sides === s}
            className={chip(sides === s)}
          >
            d{s}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center rounded border border-parchment-600 bg-parchment-50 shrink-0">
          <button
            type="button"
            onClick={() => setCountText(String(clampCount(count - 1)))}
            aria-label="Diminuir quantidade"
            className={stepper}
          >
            −
          </button>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Quantidade de dados"
            value={countText}
            onChange={e => setCountText(e.target.value)}
            onBlur={() => setCountText(String(count))}
            className="w-7 bg-transparent text-center text-xs font-mono text-ink-500 outline-none"
          />
          <button
            type="button"
            onClick={() => setCountText(String(clampCount(count + 1)))}
            aria-label="Aumentar quantidade"
            className={stepper}
          >
            +
          </button>
        </div>

        <input
          type="text"
          inputMode="numeric"
          aria-label="Modificador"
          placeholder="mod"
          value={modText}
          onChange={e => setModText(e.target.value)}
          className="w-10 shrink-0 rounded border border-parchment-600 bg-parchment-50 px-1 py-0.5
            text-center text-xs font-mono text-ink-500 outline-none placeholder:text-ink-200"
        />

        <Button
          size="sm"
          className="flex-1 truncate"
          aria-label={`Rolar ${notation}`}
          onClick={() => roll(notation, 'Rolagem livre')}
        >
          Rolar {notation}
        </Button>
      </div>
    </div>
  )
}
