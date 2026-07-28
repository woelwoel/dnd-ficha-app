import { useMemo, useState } from 'react'
import { BestiaryModal } from '../Bestiary/BestiaryModal'
import { Button } from '../../../../components/ui/Button'
import { addNpc, removeCombatant, totalXp } from '../../domain/encounter'

/**
 * Montar um grupo de monstros. Controlado: recebe um `state` de encontro só
 * com monstros e devolve o novo por `onChange`.
 *
 * Extraído do `SetupPanel` pra ser reusado pela tela de preparação — as duas
 * precisam exatamente do mesmo gesto de adicionar/remover, e mantê-lo em dois
 * lugares garantiria que divergissem.
 */
export function MonsterGroupPanel({ value, onChange }) {
  const [bestiaryOpen, setBestiaryOpen] = useState(false)
  const [rollHp, setRollHp] = useState(false)

  const xp = useMemo(() => totalXp(value), [value])

  return (
    <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 overflow-hidden">
      <h2 className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100 flex items-center justify-between">
        <span>Monstros ({value.combatants.length})</span>
        {xp > 0 && <span className="ink-italic normal-case tracking-normal">{xp} XP</span>}
      </h2>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setBestiaryOpen(true)}>
            Adicionar monstros
          </Button>
          <label className="flex items-center gap-2 text-xs ink-italic text-ink-300">
            <input
              type="checkbox"
              checked={rollHp}
              onChange={e => setRollHp(e.target.checked)}
              aria-label="Rolar HP em vez da média"
              className="w-4 h-4"
            />
            rolar HP em vez da média
          </label>
        </div>
        {value.combatants.length > 0 && (
          <ul className="divide-y divide-parchment-600/50">
            {value.combatants.map(m => (
              <li key={m.id} className="py-2 flex items-center gap-3 text-sm text-ink-500">
                <span className="flex-1">{m.name}</span>
                <span className="text-xs ink-italic text-ink-300">{m.currentHp} PV · CA {m.ac}</span>
                <button
                  type="button"
                  aria-label={`Remover ${m.name}`}
                  onClick={() => onChange(removeCombatant(value, m.id))}
                  className="text-xs text-red-700 hover:underline"
                >
                  remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BestiaryModal
        isOpen={bestiaryOpen}
        onClose={() => setBestiaryOpen(false)}
        onPick={(monster) => onChange(addNpc(value, monster, { rollHp }))}
      />
    </section>
  )
}
