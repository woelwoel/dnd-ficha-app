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

  const handleRoll = () => roll(notation, 'Rolagem livre')
  const onEnter = e => { if (e.key === 'Enter') handleRoll() }

  /* Sem classe de cor do Tailwind aqui de propósito: pintado à mão, o chip
     ficava com a affordance INVERTIDA no escuro. `bg-parchment-50` (ativo) e o
     fundo da própria barra caem no mesmo destino pela ponte (que usa
     `!important` e vence qualquer layer), enquanto o chip inativo ganhava
     superfície pela adoção automática do tokens.css — o selecionado virava um
     buraco e os outros pareciam elevados. `.ui-btn--selected` é a primitiva
     feita pra isto e resolve pra uma superfície mais clara que a do `.ui-btn`.

     `.ui-btn` traz padding próprio; num grid de 7 colunas o espaço é apertado,
     então zeramos na horizontal. Ele vive em `@layer components` e utilitário
     do Tailwind vence layer — por isso `px-0`/`py-1` continuam valendo. */
  const chip = (active) => [
    'text-xs font-bold px-0 py-1 transition-all',
    active ? 'ui-btn ui-btn--selected' : 'ui-btn',
  ].join(' ')

  const stepper = 'px-2 py-0.5 text-sm font-bold text-ink-200 hover:text-ink-500 transition-colors'

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 border-b border-parchment-600 bg-parchment-100 shrink-0">
      <div className="grid grid-cols-7 gap-1" role="group" aria-label="Tipo de dado">
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
            maxLength={2}
            aria-label="Quantidade de dados"
            value={countText}
            onChange={e => setCountText(e.target.value)}
            onBlur={() => setCountText(String(count))}
            onKeyDown={onEnter}
            className="w-7 bg-transparent text-center text-xs font-mono text-ink-500"
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

        {/* maxLength nos dois campos: `parseMod` não tem faixa, e um
            "999999999" digitado produzia uma notação larga demais pro botão.
            ±99 basta pro modificador e a quantidade tem teto 20. */}
        <input
          type="text"
          inputMode="numeric"
          maxLength={3}
          aria-label="Modificador"
          placeholder="mod"
          value={modText}
          onChange={e => setModText(e.target.value)}
          onKeyDown={onEnter}
          className="w-10 shrink-0 rounded border border-parchment-600 bg-parchment-50 px-1 py-0.5
            text-center text-xs font-mono text-ink-500 placeholder:text-ink-200"
        />

        {/* `primary` explícito, não herdado: o painel é um overlay efêmero,
            aberto sob demanda, e "Rolar" é a única ação de commit dentro dele —
            enquanto está aberto, a atenção é dele. */}
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          aria-label={`Rolar ${notation}`}
          onClick={handleRoll}
        >
          Rolar {notation}
        </Button>
      </div>
    </div>
  )
}
