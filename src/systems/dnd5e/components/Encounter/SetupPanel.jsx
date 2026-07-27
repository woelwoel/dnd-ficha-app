import { useMemo, useState } from 'react'
import { BestiaryModal } from '../Bestiary/BestiaryModal'
import { Button } from '../../../../components/ui/Button'
import {
  emptyEncounterState, addPc, addNpc, removeCombatant,
  rollInitiative, startEncounter, totalXp,
} from '../../domain/encounter'

/**
 * Fase de montagem: quem da companhia está na cena, quais monstros entram, e a
 * rolagem de iniciativa que inicia o combate.
 *
 * Puro em relação a dados: recebe `party` (companhia já carregada pela tela de
 * cima) e devolve o state montado via `onStart`. Não fala com Supabase.
 *
 * @param {Array<{characterId,name,initiativeBonus}>} party — companhia da mesa
 * @param {(state:object) => void} onStart — recebe o state já iniciado
 * @param {() => number} [rng] — injetável pro teste fixar o dado
 */
export function SetupPanel({ party, onStart, rng = Math.random }) {
  const [excluded, setExcluded] = useState(() => new Set())
  const [monsters, setMonsters] = useState(emptyEncounterState)
  const [bestiaryOpen, setBestiaryOpen] = useState(false)
  const [rollHp, setRollHp] = useState(false)

  const chosen = party.filter(p => !excluded.has(p.characterId))
  const xp = useMemo(() => totalXp(monsters), [monsters])
  const canStart = chosen.length + monsters.combatants.length > 0

  function toggle(characterId) {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(characterId)) next.delete(characterId)
      else next.add(characterId)
      return next
    })
  }

  function start() {
    let s = emptyEncounterState()
    for (const p of chosen) {
      s = addPc(s, { characterId: p.characterId, name: p.name, initiativeBonus: p.initiativeBonus ?? 0 })
    }
    for (const m of monsters.combatants) {
      // Reusa o combatente já montado (nome/ordinal/status), só renumerando o
      // id na sequência nova — o id de rascunho não sobrevive à montagem.
      s = { ...s, nextSeq: s.nextSeq + 1, combatants: [...s.combatants, { ...m, id: `k${s.nextSeq}` }] }
    }
    onStart(startEncounter(rollInitiative(s, rng).state))
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 overflow-hidden">
        <h2 className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100">
          Quem está na cena ({chosen.length})
        </h2>
        {party.length === 0 ? (
          <p className="p-4 text-sm ink-italic text-ink-300">Nenhuma ficha vinculada à mesa.</p>
        ) : (
          <ul className="divide-y divide-parchment-600/50">
            {party.map(p => (
              <li key={p.characterId} className="px-4 py-2 flex items-center gap-3">
                <input
                  id={`cena-${p.characterId}`}
                  type="checkbox"
                  checked={!excluded.has(p.characterId)}
                  onChange={() => toggle(p.characterId)}
                  className="w-4 h-4"
                />
                <label htmlFor={`cena-${p.characterId}`} className="flex-1 text-sm text-ink-500">
                  {p.name}
                </label>
                <span className="text-xs ink-italic text-ink-300">
                  inic. {(p.initiativeBonus ?? 0) >= 0 ? '+' : ''}{p.initiativeBonus ?? 0}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 overflow-hidden">
        <h2 className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100 flex items-center justify-between">
          <span>Monstros ({monsters.combatants.length})</span>
          {xp > 0 && <span className="ink-italic normal-case tracking-normal">{xp} XP</span>}
        </h2>
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setBestiaryOpen(true)}>
              Adicionar monstros
            </Button>
            <label className="flex items-center gap-2 text-xs ink-italic text-ink-300">
              <input type="checkbox" checked={rollHp} onChange={e => setRollHp(e.target.checked)} className="w-4 h-4" />
              rolar HP em vez da média
            </label>
          </div>
          {monsters.combatants.length > 0 && (
            <ul className="divide-y divide-parchment-600/50">
              {monsters.combatants.map(m => (
                <li key={m.id} className="py-2 flex items-center gap-3 text-sm text-ink-500">
                  <span className="flex-1">{m.name}</span>
                  <span className="text-xs ink-italic text-ink-300">{m.currentHp} PV · CA {m.ac}</span>
                  <button
                    type="button"
                    aria-label={`Remover ${m.name}`}
                    onClick={() => setMonsters(s => removeCombatant(s, m.id))}
                    className="text-xs text-red-700 hover:underline"
                  >
                    remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div>
        <Button onClick={start} disabled={!canStart}>Rolar iniciativa</Button>
      </div>

      <BestiaryModal
        isOpen={bestiaryOpen}
        onClose={() => setBestiaryOpen(false)}
        onPick={(monster) => setMonsters(s => addNpc(s, monster, { rollHp }))}
      />
    </div>
  )
}
